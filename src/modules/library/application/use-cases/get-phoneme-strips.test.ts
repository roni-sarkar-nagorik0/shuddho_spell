/**
 * F13.1 — `library/application` was at **0% line coverage**.
 *
 * The claims here are the ones that make `PhonemeStrip` a diagnostic instead of
 * a decoration: that the cells carry **this learner's** accuracy, that a symbol
 * outside the 44-phoneme inventory reads as never-attempted rather than as a
 * zero, that the curated `word_phonemes` ids win over the derived ones, and
 * that the caller's word order survives a repository that gives no ordering
 * guarantee. Every one of them compiles when wrong.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { MasteryRecord } from '@/modules/progress/domain/entities/mastery-record';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { Phoneme } from '../../domain/entities/phoneme';
import { Word } from '../../domain/entities/word';
import { type IPhonemeRepository } from '../../domain/repositories/phoneme-repository';
import { type IWordPhonemeRepository } from '../../domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { GetPhonemeStripsUseCase } from './get-phoneme-strips';

/** Four real phonemes, enough to segment the words below. */
const INVENTORY: readonly Phoneme[] = [
  new Phoneme('ph-s', IpaTranscription.of('s'), 'consonant', 'স', 'alveolar fricative', null),
  new Phoneme('ph-uh', IpaTranscription.of('ʌ'), 'vowel', 'আ', 'open-mid back vowel', null),
  new Phoneme('ph-t', IpaTranscription.of('t'), 'consonant', null, 'alveolar stop', 'ট'),
  new Phoneme('ph-l', IpaTranscription.of('l'), 'consonant', 'ল', 'lateral', null),
];

function word(id: string, text: string, ipa: string): Word {
  return new Word(id, text, IpaTranscription.of(ipa), [text], 'সাট্‌ল্', 'সূক্ষ্ম', 'adjective', null, 1, null, []);
}

function record(dimensionId: string, attempts: number, correct: number): MasteryRecord {
  return new MasteryRecord({
    id: `m-${dimensionId}`,
    profileId: 'p1',
    dimension: 'phoneme',
    dimensionId,
    attempts,
    correct,
    lastUpdatedAt: new Date('2026-08-19T00:00:00Z'),
  });
}

function build(options: {
  readonly words: readonly Word[];
  readonly records?: readonly MasteryRecord[];
  readonly links?: readonly { readonly wordId: string; readonly position: number; readonly phonemeId: string }[];
  readonly profile?: boolean;
}): GetPhonemeStripsUseCase {
  const profiles: ILearnerProfileRepository = {
    findByUserId: () =>
      Promise.resolve(options.profile === false ? null : makeLearnerProfile({ id: 'p1' })),
    findById: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('not used')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };

  const words: IWordRepository = {
    findById: () => Promise.resolve(null),
    // Deliberately reversed: the repository promises no ordering, and the use
    // case must restore the caller's.
    findByIds: () => Promise.resolve([...options.words].reverse()),
    findUpToWeek: () => Promise.resolve([]),
    search: () => Promise.resolve([]),
  };

  const wordPhonemes: IWordPhonemeRepository = {
    findByWordIds: () => Promise.resolve(options.links ?? []),
  };

  const phonemes: IPhonemeRepository = {
    findByIds: () => Promise.resolve([]),
    listAll: () => Promise.resolve(INVENTORY),
  };

  const mastery: IMasteryRepository = {
    findByProfile: () => Promise.resolve(options.records ?? []),
    saveMany: () => Promise.resolve(),
  };

  return new GetPhonemeStripsUseCase(profiles, words, wordPhonemes, phonemes, mastery);
}

describe('GetPhonemeStripsUseCase', () => {
  it('tints each cell with the learner’s own accuracy for that sound', async () => {
    const strips = await build({
      words: [word('w1', 'sut', 'sʌt')],
      records: [record('ph-s', 10, 9), record('ph-uh', 4, 1)],
    }).execute({ userId: 'u1', wordIds: ['w1'] });

    const cells = strips[0]?.cells ?? [];

    expect(cells.map((cell) => cell.symbol)).toStrictEqual(['s', 'ʌ', 't']);
    expect(cells[0]?.accuracy).toBeCloseTo(0.9);
    expect(cells[1]?.accuracy).toBeCloseTo(0.25);
    // No mastery row for /t/: never attempted, which is not zero.
    expect(cells[2]?.accuracy).toBeNull();
    expect(cells[2]?.attempts).toBe(0);
  });

  it('reads a mastery row with zero attempts as never attempted, not as 0%', async () => {
    const strips = await build({
      words: [word('w1', 'sut', 'sʌt')],
      records: [record('ph-s', 0, 0)],
    }).execute({ userId: 'u1', wordIds: ['w1'] });

    expect(strips[0]?.cells[0]?.accuracy).toBeNull();
  });

  it('lets the curated word_phonemes id win over the derived one', async () => {
    const strips = await build({
      words: [word('w1', 'sut', 'sʌt')],
      links: [{ wordId: 'w1', position: 0, phonemeId: 'ph-curated' }],
      records: [record('ph-curated', 2, 2), record('ph-s', 10, 0)],
    }).execute({ userId: 'u1', wordIds: ['w1'] });

    const first = strips[0]?.cells[0];

    expect(first?.phonemeId).toBe('ph-curated');
    expect(first?.accuracy).toBe(1);
  });

  it('returns strips in the caller’s word order, not the repository’s', async () => {
    const strips = await build({
      words: [word('w1', 'sut', 'sʌt'), word('w2', 'lut', 'lʌt')],
    }).execute({ userId: 'u1', wordIds: ['w1', 'w2'] });

    expect(strips.map((strip) => strip.wordId)).toStrictEqual(['w1', 'w2']);
  });

  it('short-circuits an empty request without touching a repository', async () => {
    const useCase = build({ words: [] });

    await expect(useCase.execute({ userId: 'u1', wordIds: [] })).resolves.toStrictEqual([]);
  });

  it('throws ProfileNotFoundError rather than returning empty strips', async () => {
    await expect(
      build({ words: [], profile: false }).execute({ userId: 'ghost', wordIds: ['w1'] }),
    ).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});
