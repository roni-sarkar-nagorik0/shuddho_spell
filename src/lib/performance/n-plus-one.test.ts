/**
 * F13.7 — the N+1 audit, **counted** rather than reviewed.
 *
 * "No N+1" is the kind of claim that is true on the day it is written and false
 * three commits later, because the change that breaks it looks innocent: a
 * `.map(async …)` inside a loop that used to be a single batched read. So these
 * count actual repository calls through counting fakes and assert a ceiling.
 *
 * The ceilings are deliberately exact. A test that asserted "fewer than fifty"
 * would pass through the entire regression it exists to catch.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { GetPhonemeStripsUseCase } from '@/modules/library/application/use-cases/get-phoneme-strips';
import { Phoneme } from '@/modules/library/domain/entities/phoneme';
import { Word } from '@/modules/library/domain/entities/word';
import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { type IWordPhonemeRepository } from '@/modules/library/domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { GetProgramDayUseCase } from '@/modules/program/application/use-cases/get-program-day';
import { ProgramDay } from '@/modules/program/domain/entities/program-day';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';

/** Counts every call, by method name. */
function counter(): { readonly calls: Map<string, number>; readonly count: (name: string) => void } {
  const calls = new Map<string, number>();

  return {
    calls,
    count: (name) => { calls.set(name, (calls.get(name) ?? 0) + 1); },
  };
}

function word(id: string): Word {
  return new Word(
    id, `w${id}`, IpaTranscription.of('sʌt'), ['w'],
    'সাট্', 'শব্দ', 'noun', null, 1, null, [],
  );
}

const INVENTORY: readonly Phoneme[] = [
  new Phoneme('ph-s', IpaTranscription.of('s'), 'consonant', 'স', 'note', null),
  new Phoneme('ph-uh', IpaTranscription.of('ʌ'), 'vowel', 'আ', 'note', null),
  new Phoneme('ph-t', IpaTranscription.of('t'), 'consonant', null, 'note', 'ট'),
];

function profiles(): ILearnerProfileRepository {
  return {
    findByUserId: () => Promise.resolve(makeLearnerProfile({ id: 'p1', currentDayIndex: DayIndex.of(28) })),
    findById: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('not used')),
    countByRole: () => Promise.reject(new Error('only the admin roster counts roles')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };
}

describe('GetPhonemeStrips is flat in the number of words (F13.7)', () => {
  async function run(wordCount: number): Promise<Map<string, number>> {
    const meter = counter();
    const words = Array.from({ length: wordCount }, (_, index) => word(`w${String(index)}`));

    const wordRepo: IWordRepository = {
      findById: () => Promise.resolve(null),
      findByIds: () => { meter.count('words.findByIds'); return Promise.resolve(words); },
      findUpToWeek: () => Promise.resolve([]),
      search: () => Promise.resolve([]),
    };

    const links: IWordPhonemeRepository = {
      findByWordIds: () => { meter.count('wordPhonemes.findByWordIds'); return Promise.resolve([]); },
    };

    const phonemes: IPhonemeRepository = {
      findByIds: () => Promise.resolve([]),
      listAll: () => { meter.count('phonemes.listAll'); return Promise.resolve(INVENTORY); },
    };

    const mastery: IMasteryRepository = {
      findByProfile: () => { meter.count('mastery.findByProfile'); return Promise.resolve([]); },
      saveMany: () => Promise.resolve(),
    };

    await new GetPhonemeStripsUseCase(profiles(), wordRepo, links, phonemes, mastery).execute({
      userId: 'u1',
      wordIds: words.map((entry) => entry.id),
    });

    return meter.calls;
  }

  it('costs exactly four reads for one word', async () => {
    const calls = await run(1);

    expect([...calls.values()].reduce((total, value) => total + value, 0)).toBe(4);
  });

  it('still costs exactly four reads for forty words', async () => {
    const calls = await run(40);

    // The whole point. A `.map(async …)` over the words would make this 160.
    expect([...calls.values()].reduce((total, value) => total + value, 0)).toBe(4);
    expect(calls.get('words.findByIds')).toBe(1);
    expect(calls.get('phonemes.listAll')).toBe(1);
    expect(calls.get('mastery.findByProfile')).toBe(1);
  });
});

describe('GetProgramDay batches its three content reads (F13.7)', () => {
  it('costs one read per content kind however many items the day has', async () => {
    const meter = counter();

    const items = Array.from({ length: 12 }, (_, index) => ({
      itemType: 'word' as const,
      itemId: `w${String(index)}`,
      orderIndex: index,
    }));

    const program: IProgramRepository = {
      findDay: () =>
        Promise.resolve(
          new ProgramDay('d1', 'standard28', DayIndex.of(1), 1, 'Day', 'desc', 25, items),
        ),
      listDays: () => Promise.resolve([]),
    };

    const words: IWordRepository = {
      findById: () => Promise.reject(new Error('a per-item read is the N+1 this forbids')),
      findByIds: () => { meter.count('words.findByIds'); return Promise.resolve([]); },
      findUpToWeek: () => Promise.resolve([]),
      search: () => Promise.resolve([]),
    };

    const sentences: ISentenceItemRepository = {
      findById: () => Promise.reject(new Error('a per-item read is the N+1 this forbids')),
      findByIds: () => { meter.count('sentences.findByIds'); return Promise.resolve([]); },
      listAll: () => Promise.resolve([]),
    };

    const rules: IRuleFamilyRepository = {
      findByIds: () => { meter.count('rules.findByIds'); return Promise.resolve([]); },
      listAll: () => Promise.resolve([]),
    };

    await new GetProgramDayUseCase(profiles(), program, words, sentences, rules).execute({
      userId: 'u1',
      dayIndex: 1,
    });

    expect(meter.calls.get('words.findByIds')).toBe(1);
    expect(meter.calls.get('sentences.findByIds')).toBe(1);
    expect(meter.calls.get('rules.findByIds')).toBe(1);
  });
});
