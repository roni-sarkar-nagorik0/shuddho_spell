/**
 * F13.1 — the other half of `library/application`.
 *
 * The keyset contract is the whole point of this use case and it is entirely
 * invisible to a typechecker: ask for one row more than the page size, and if
 * it comes back there is a next page whose cursor is the **last row shown**,
 * not the extra one. Getting that off by one repeats or skips a word on every
 * page boundary.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { RuleFamily } from '../../domain/entities/rule-family';
import { Word } from '../../domain/entities/word';
import { type IRuleFamilyRepository } from '../../domain/repositories/rule-family-repository';
import { type IWordSearch, type IWordRepository } from '../../domain/repositories/word-repository';
import { GetLibraryPageUseCase } from './get-library-page';

const RULE = new RuleFamily('r1', 'silent_letters', 'statement', ['a', 'b', 'c'], ['d', 'e']);

function word(text: string, ruleFamilyId: string | null = null): Word {
  return new Word(
    `id-${text}`, text, IpaTranscription.of('wɜːd'), [text],
    'ওয়ার্ড', 'শব্দ', 'noun', ruleFamilyId, 1, null, [],
  );
}

function reviewed(itemId: string, seen: number, correct: number, mastered: boolean): ReviewItem {
  return new ReviewItem({
    id: `rev-${itemId}`, profileId: 'p1', itemId, itemType: 'word',
    intervalIndex: 1, dueAt: new Date('2026-09-01T00:00:00Z'),
    timesSeen: seen, timesCorrect: correct, consecutiveCorrect: 0,
    lastCorrectOn: null, isMastered: mastered, lastErrorTags: [],
  });
}

interface IHarness {
  readonly useCase: GetLibraryPageUseCase;
  readonly searches: IWordSearch[];
}

function build(options: {
  readonly rows: readonly Word[];
  readonly reviews?: readonly ReviewItem[];
  readonly profile?: boolean;
}): IHarness {
  const searches: IWordSearch[] = [];

  const profiles: ILearnerProfileRepository = {
    findByUserId: () =>
      Promise.resolve(options.profile === false ? null : makeLearnerProfile({ id: 'p1' })),
    findById: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('not used')),
    countByRole: () => Promise.reject(new Error('only the admin roster counts roles')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };

  const words: IWordRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([]),
    findUpToWeek: () => Promise.resolve([]),
    search: (search) => {
      searches.push(search);
      return Promise.resolve(options.rows.slice(0, search.limit));
    },
  };

  const rules: IRuleFamilyRepository = {
    findByIds: () => Promise.resolve([RULE]),
    listAll: () => Promise.resolve([RULE]),
  };

  const reviews: IReviewItemRepository = {
    findDue: () => Promise.resolve([]),
    findByItem: () => Promise.resolve(null),
    upsert: (item) => Promise.resolve(item),
    countDue: () => Promise.resolve(0),
    findByProfile: () => Promise.resolve(options.reviews ?? []),
  };

  return { useCase: new GetLibraryPageUseCase(profiles, words, rules, reviews), searches };
}

describe('GetLibraryPageUseCase', () => {
  it('asks for one row more than the page size', async () => {
    const harness = build({ rows: [word('a'), word('b')] });
    await harness.useCase.execute({ userId: 'u1', pageSize: 2 });

    expect(harness.searches[0]?.limit).toBe(3);
  });

  it('sets the cursor to the last row SHOWN when a further page exists', async () => {
    const harness = build({ rows: [word('a'), word('b'), word('c')] });
    const page = await harness.useCase.execute({ userId: 'u1', pageSize: 2 });

    expect(page.words.map((entry) => entry.text)).toStrictEqual(['a', 'b']);
    // 'b', not 'c'. The extra row is evidence, never content.
    expect(page.nextCursor).toBe('b');
  });

  it('reports no next page when the extra row does not come back', async () => {
    const harness = build({ rows: [word('a'), word('b')] });
    const page = await harness.useCase.execute({ userId: 'u1', pageSize: 2 });

    expect(page.words).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it('clamps an absurd page size rather than trusting the caller', async () => {
    const harness = build({ rows: [] });
    await harness.useCase.execute({ userId: 'u1', pageSize: 100_000 });

    expect(harness.searches[0]?.limit).toBe(101);
  });

  it('reports a word never got wrong as null accuracy, not as 100%', async () => {
    const harness = build({ rows: [word('a')], reviews: [] });
    const page = await harness.useCase.execute({ userId: 'u1', pageSize: 10 });

    expect(page.words[0]?.accuracy).toBeNull();
    expect(page.words[0]?.timesSeen).toBe(0);
    expect(page.words[0]?.isMastered).toBe(false);
  });

  it('joins the learner’s own review record onto the row', async () => {
    const harness = build({
      rows: [word('a')],
      reviews: [reviewed('id-a', 4, 3, true)],
    });
    const page = await harness.useCase.execute({ userId: 'u1', pageSize: 10 });

    expect(page.words[0]?.accuracy).toBeCloseTo(0.75);
    expect(page.words[0]?.isMastered).toBe(true);
  });

  it('resolves the rule family code, and null when there is none', async () => {
    const harness = build({ rows: [word('a', 'r1'), word('b')] });
    const page = await harness.useCase.execute({ userId: 'u1', pageSize: 10 });

    expect(page.words[0]?.ruleFamilyCode).toBe('silent_letters');
    expect(page.words[1]?.ruleFamilyCode).toBeNull();
  });

  it('throws ProfileNotFoundError rather than returning a public word list', async () => {
    const harness = build({ rows: [word('a')], profile: false });

    await expect(harness.useCase.execute({ userId: 'ghost', pageSize: 10 })).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});
