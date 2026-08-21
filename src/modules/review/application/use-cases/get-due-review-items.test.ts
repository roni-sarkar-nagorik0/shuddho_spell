/**
 * F4.14's acceptance criterion: **40 due items → 25 returned, most overdue
 * first, ties broken by lowest accuracy.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one exists
 * because the criterion is three exact numbers and an ordering — the kind of
 * claim that is either right or quietly wrong, and typechecking cannot tell
 * which. A queue that returns 40, or sorts ascending, compiles perfectly.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type SentenceItem } from '@/modules/library/domain/entities/sentence-item';
import { Word } from '@/modules/library/domain/entities/word';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { ReviewItem } from '../../domain/entities/review-item';
import { type IReviewItemRepository } from '../../domain/repositories/review-item-repository';
import { GetDueReviewItemsUseCase } from './get-due-review-items';

const NOW = new Date('2026-08-19T06:00:00Z');
const TZ = 'Asia/Dhaka';

const clock: IClock = { now: () => NOW };

const profiles: ILearnerProfileRepository = {
  findByUserId: () => Promise.resolve(makeLearnerProfile({ id: 'p1', timezone: TZ })),
  findById: () => Promise.reject(new Error('the request path resolves a profile by session, not by id')),
  listAll: () => Promise.reject(new Error('only the hourly notification job walks the roster')),
  countByRole: () => Promise.reject(new Error('only the admin roster counts roles')),
  insertIfAbsent: () => Promise.reject(new Error('not used')),
  save: () => Promise.reject(new Error('not used')),
};

function word(id: string): Word {
  return new Word(
    id, `w-${id}`, IpaTranscription.of('wɜːd'), ['word'],
    'ওয়ার্ড', 'শব্দ', 'noun', null, 1, null, [],
  );
}

/** `daysAgo` days overdue, with the given accuracy. */
function due(id: string, daysAgo: number, seen: number, correct: number): ReviewItem {
  const dueAt = new Date(NOW.getTime() - daysAgo * 86_400_000);

  return new ReviewItem({
    id, profileId: 'p1', itemId: `item-${id}`, itemType: 'word',
    intervalIndex: 0, dueAt, timesSeen: seen, timesCorrect: correct,
    consecutiveCorrect: 0, lastCorrectOn: null, isMastered: false, lastErrorTags: [],
  });
}

function useCaseOver(items: readonly ReviewItem[]): GetDueReviewItemsUseCase {
  const reviews: IReviewItemRepository = {
    findDue: () => Promise.resolve(items),
    findByItem: () => Promise.resolve(null),
    upsert: (item) => Promise.resolve(item),
    countDue: () => Promise.resolve(items.length),
    findByProfile: () => Promise.resolve(items),
  };
  const words: IWordRepository = {
    findById: () => Promise.resolve(null),
    findByIds: (ids) => Promise.resolve(ids.map(word)),
    findUpToWeek: () => Promise.resolve([] as readonly Word[]),
    // F11.11 widened IWordRepository with a paginated `search`. Neither of
    // these use cases calls it; the fake satisfies the port and nothing else.
    search: () => Promise.resolve([] as readonly Word[]),
  };
  const sentences: ISentenceItemRepository = {
    findById: () => Promise.resolve(null),
    findByIds: () => Promise.resolve([] as readonly SentenceItem[]),
    listAll: () => Promise.resolve([] as readonly SentenceItem[]),
    findContaining: () => Promise.reject(new Error('only the landing page demo looks a word up')),
  };

  return new GetDueReviewItemsUseCase(profiles, reviews, words, sentences, clock);
}

describe('the daily review queue', () => {
  it('returns 25 of 40, and says how many were really due', async () => {
    const forty = Array.from({ length: 40 }, (_, n) => due(`r${String(n)}`, 1, 10, 5));

    const queue = await useCaseOver(forty).execute({ userId: 'u1' });

    expect(queue.items).toHaveLength(25);
    expect(queue.totalDue).toBe(40);
  });

  it('puts the most overdue first', async () => {
    const queue = await useCaseOver([
      due('recent', 1, 10, 5),
      due('ancient', 30, 10, 5),
      due('middling', 7, 10, 5),
    ]).execute({ userId: 'u1' });

    expect(queue.items.map((item) => item.reviewItemId)).toEqual([
      'ancient',
      'middling',
      'recent',
    ]);
  });

  it('breaks ties by lowest accuracy, so the queue is not full of known words', async () => {
    const queue = await useCaseOver([
      due('knows-it', 3, 10, 9),
      due('struggling', 3, 10, 2),
      due('middling', 3, 10, 5),
    ]).execute({ userId: 'u1' });

    expect(queue.items.map((item) => item.reviewItemId)).toEqual([
      'struggling',
      'middling',
      'knows-it',
    ]);
  });

  it('measures overdue at the learner-local day boundary', async () => {
    // 06:00 UTC is noon in Dhaka on the 19th. An item due at 23:00 UTC on the
    // 17th was due on the 18th locally — one day, not two.
    const queue = await useCaseOver([
      new ReviewItem({
        id: 'r1', profileId: 'p1', itemId: 'item-r1', itemType: 'word',
        intervalIndex: 0, dueAt: new Date('2026-08-17T23:00:00Z'),
        timesSeen: 1, timesCorrect: 1, consecutiveCorrect: 0,
        lastCorrectOn: null, isMastered: false, lastErrorTags: [],
      }),
    ]).execute({ userId: 'u1' });

    expect(queue.items[0]?.daysOverdue).toBe(1);
  });
});
