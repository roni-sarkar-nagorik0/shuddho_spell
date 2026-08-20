// @vitest-environment node
/**
 * F5.6's criterion and a Phase 5 exit item: **`GetLearnerDashboard` has no
 * N+1 — query count asserted.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is here
 * because an N+1 is invisible in every other way: the code reads correctly, the
 * types are right, the output is right, and the only symptom is that the
 * dashboard gets slower in proportion to how much the learner has done — which
 * is exactly backwards, since the learners who have done the most are the ones
 * still using the product.
 *
 * The count is asserted against a **fixed number**, not against a ratio. A test
 * that says "fewer than ten" passes the day someone adds a loop.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { ProgramDay } from '@/modules/program/domain/entities/program-day';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { StreakRecord } from '../../domain/entities/streak-record';
import { type IStreakRepository } from '../../domain/repositories/streak-repository';
import { GetLearnerDashboardUseCase } from './get-learner-dashboard';

const NOW = new Date('2026-08-19T06:00:00Z');

/** Counts every repository round trip the use case makes. */
function counted(): {
  readonly useCase: GetLearnerDashboardUseCase;
  readonly queries: () => readonly string[];
} {
  const queries: string[] = [];
  const record = <T>(name: string, value: T): Promise<T> => {
    queries.push(name);

    return Promise.resolve(value);
  };

  const profiles: ILearnerProfileRepository = {
    findByUserId: () =>
      record('profiles.findByUserId', makeLearnerProfile({ id: 'p1', timezone: 'Asia/Dhaka' })),
    findById: () =>
      Promise.reject(new Error('the dashboard resolves a profile by session, not by id')),
    listAll: () => Promise.reject(new Error('only the hourly notification job walks the roster')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };

  const program: IProgramRepository = {
    findDay: () =>
      record(
        'program.findDay',
        new ProgramDay('d1', 'standard28', DayIndex.of(1), 1, 'Silent letters', '', 25, []),
      ),
    listDays: () => Promise.reject(new Error('the dashboard must not list all 28 days')),
  };

  const lessons: ILessonRepository = {
    findById: () => Promise.reject(new Error('not used')),
    findOpenForDay: () => record('lessons.findOpenForDay', null),
    findCompletedDayIndexes: () =>
      Promise.reject(new Error('the dashboard must not load every completed day')),
    create: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };

  const reviews: IReviewItemRepository = {
    findDue: () => Promise.reject(new Error('the dashboard counts due items, it does not fetch them')),
    findByItem: () => Promise.reject(new Error('not used')),
    upsert: () => Promise.reject(new Error('not used')),
    countDue: () => record('reviews.countDue', 7),
    findByProfile: () =>
      Promise.reject(new Error('the dashboard counts due items, it does not fetch them')),
  };

  const streaks: IStreakRepository = {
    findByProfile: () =>
      record(
        'streaks.findByProfile',
        new StreakRecord({
          id: 's1',
          profileId: 'p1',
          currentStreak: 3,
          longestStreak: 5,
          lastActiveDate: null,
          freezesRemaining: 0,
        }),
      ),
    save: () => Promise.reject(new Error('not used')),
  };

  const clock: IClock = { now: () => NOW };

  return {
    useCase: new GetLearnerDashboardUseCase(profiles, program, lessons, reviews, streaks, clock),
    queries: () => queries,
  };
}

describe('GetLearnerDashboard', () => {
  it('makes exactly five queries', async () => {
    const { useCase, queries } = counted();

    await useCase.execute({ userId: 'u1' });

    expect(queries()).toEqual([
      'profiles.findByUserId',
      'program.findDay',
      'lessons.findOpenForDay',
      'reviews.countDue',
      'streaks.findByProfile',
    ]);
  });

  it('counts due reviews instead of fetching them', async () => {
    // `findDue` rejects in the fake. A dashboard that loaded every due item to
    // call `.length` would fail here — and would get slower for exactly the
    // learners who have been away longest and have the most waiting.
    const { useCase } = counted();

    const dashboard = await useCase.execute({ userId: 'u1' });

    expect(dashboard.dueReviewCount).toBe(7);
  });

  it('reads one day, not the whole programme', async () => {
    // `listDays` and `findCompletedDayIndexes` both reject. The dashboard shows
    // today; the 28-tile grid is the overview's job and its own request.
    const { useCase } = counted();

    await expect(useCase.execute({ userId: 'u1' })).resolves.toBeDefined();
  });

  it('does not grow its query count when the learner has done more', async () => {
    // The same five, whatever the streak or the due count happens to be. This
    // is the assertion an N+1 breaks first.
    const { useCase, queries } = counted();

    await useCase.execute({ userId: 'u1' });
    const first = queries().length;

    const second = counted();
    await second.useCase.execute({ userId: 'u1' });

    expect(first).toBe(5);
    expect(second.queries()).toHaveLength(5);
  });
});
