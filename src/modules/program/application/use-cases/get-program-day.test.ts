/**
 * F13.1 — the other half of `program/application`, which was at 0%.
 *
 * The claim that matters most here is a **security** one: a locked day must be
 * refused *before* any content is read, so a learner probing urls cannot make
 * the server assemble a day it is about to withhold. A test is the only way to
 * assert an ordering like that — both versions return the same error.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { RuleFamily } from '@/modules/library/domain/entities/rule-family';
import { SentenceItem } from '@/modules/library/domain/entities/sentence-item';
import { Word } from '@/modules/library/domain/entities/word';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { DayLockedError } from '../../domain/errors/day-locked.error';
import { DayNotFoundError } from '../../domain/errors/day-not-found.error';
import { ProgramDay } from '../../domain/entities/program-day';
import { type IProgramRepository } from '../../domain/repositories/program-repository';
import { GetProgramDayUseCase } from './get-program-day';

const WORD = new Word(
  'w1',
  'subtle',
  IpaTranscription.of('ˈsʌtl'),
  ['sub', 'tle'],
  'সাট্‌ল্',
  'সূক্ষ্ম',
  'adjective',
  null,
  1,
  null,
  ['suttle'],
);

const SENTENCE = new SentenceItem(
  's1',
  'সে খুব সূক্ষ্ম।',
  'She is very subtle.',
  ['She is really subtle.'],
  ['quiet', 'loud'],
  [],
  'easy',
);

const RULE = new RuleFamily('r1', 'silent_letters', 'Some letters are written and not said.', ['subtle', 'debt', 'knee'], ['tackle', 'ankle']);

function programDay(): ProgramDay {
  return new ProgramDay('d3', 'standard28', DayIndex.of(3), 1, 'Silent letters', 'The b that is not said.', 25, [
    { itemType: 'word', itemId: 'w1', orderIndex: 0 },
    { itemType: 'sentence', itemId: 's1', orderIndex: 1 },
    { itemType: 'rule_family', itemId: 'r1', orderIndex: 2 },
  ]);
}

function build(options: {
  readonly currentDay: number;
  readonly day?: ProgramDay | null;
  readonly onWordRead?: () => void;
}): GetProgramDayUseCase {
  const profiles: ILearnerProfileRepository = {
    findByUserId: () =>
      Promise.resolve(
        makeLearnerProfile({ id: 'p1', currentDayIndex: DayIndex.of(options.currentDay) }),
      ),
    findById: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('not used')),
    countByRole: () => Promise.reject(new Error('only the admin roster counts roles')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };

  const program: IProgramRepository = {
    findDay: () => Promise.resolve(options.day === undefined ? programDay() : options.day),
    listDays: () => Promise.resolve([]),
  };

  const words: IWordRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => {
      options.onWordRead?.();
      return Promise.resolve([WORD]);
    },
    findUpToWeek: () => Promise.resolve([]),
    search: () => Promise.resolve([]),
  };

  const sentences: ISentenceItemRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([SENTENCE]),
    listAll: () => Promise.resolve([]),
    findContaining: () => Promise.reject(new Error('only the landing page demo looks a word up')),
  };

  const rules: IRuleFamilyRepository = {
    findByIds: () => Promise.resolve([RULE]),
    listAll: () => Promise.resolve([]),
  };

  return new GetProgramDayUseCase(profiles, program, words, sentences, rules);
}

describe('GetProgramDayUseCase', () => {
  it('resolves a reached day into words, sentences and rules', async () => {
    const detail = await build({ currentDay: 3 }).execute({ userId: 'u1', dayIndex: 3 });

    expect(detail.title).toBe('Silent letters');
    expect(detail.words).toHaveLength(1);
    expect(detail.words[0]?.ipa).toBe('ˈsʌtl');
    expect(detail.sentences[0]?.distractorWords).toStrictEqual(['quiet', 'loud']);
    expect(detail.rules[0]?.counterexamples).toStrictEqual(['tackle', 'ankle']);
  });

  it('never ships the answer keys — acceptedAlternatives and commonMisspellings', async () => {
    const detail = await build({ currentDay: 3 }).execute({ userId: 'u1', dayIndex: 3 });

    // Both exist on the entities above and must not survive the mapping.
    expect(JSON.stringify(detail)).not.toContain('suttle');
    expect(JSON.stringify(detail)).not.toContain('She is really subtle.');
  });

  it('refuses a locked day BEFORE reading any content', async () => {
    const onWordRead = vi.fn();

    await expect(
      build({ currentDay: 2, onWordRead }).execute({ userId: 'u1', dayIndex: 3 }),
    ).rejects.toBeInstanceOf(DayLockedError);

    expect(onWordRead).not.toHaveBeenCalled();
  });

  it('throws DayNotFoundError when the track has no such day', async () => {
    await expect(
      build({ currentDay: 5, day: null }).execute({ userId: 'u1', dayIndex: 3 }),
    ).rejects.toBeInstanceOf(DayNotFoundError);
  });

  it('throws ProfileNotFoundError before anything else', async () => {
    const profiles: ILearnerProfileRepository = {
      findByUserId: () => Promise.resolve(null),
      findById: () => Promise.reject(new Error('not used')),
      listAll: () => Promise.reject(new Error('not used')),
      countByRole: () => Promise.reject(new Error('only the admin roster counts roles')),
      insertIfAbsent: () => Promise.reject(new Error('not used')),
      save: () => Promise.reject(new Error('not used')),
    };

    const useCase = new GetProgramDayUseCase(
      profiles,
      { findDay: () => Promise.resolve(null), listDays: () => Promise.resolve([]) },
      {
        findById: () => Promise.resolve(null),
        findByIds: () => Promise.resolve([]),
        findUpToWeek: () => Promise.resolve([]),
        search: () => Promise.resolve([]),
      },
      {
        findById: () => Promise.resolve(null),
        findByIds: () => Promise.resolve([]),
        listAll: () => Promise.resolve([]),
        findContaining: () => Promise.resolve([]),
      },
      { findByIds: () => Promise.resolve([]), listAll: () => Promise.resolve([]) },
    );

    await expect(useCase.execute({ userId: 'ghost', dayIndex: 1 })).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});
