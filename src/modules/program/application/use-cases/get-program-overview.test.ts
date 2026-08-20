/**
 * F13.1 — `program/application` was at **0% line coverage**, one of the three
 * weakest modules in the tree.
 *
 * These are the claims a typechecker cannot make: that `isUnlocked` is
 * "reached or earlier" rather than "not yet done", that a finished day stays
 * open, and that `completedDays` counts distinct days rather than sessions. All
 * three compile perfectly when wrong.
 */
import { describe, expect, it } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { ProgramDay } from '../../domain/entities/program-day';
import { type IProgramRepository } from '../../domain/repositories/program-repository';
import { GetProgramOverviewUseCase } from './get-program-overview';

function day(index: number): ProgramDay {
  return new ProgramDay(
    `d${String(index)}`,
    'standard28',
    DayIndex.of(index),
    Math.ceil(index / 7),
    `Day ${String(index)}`,
    'description',
    25,
    [],
  );
}

function profilesReturning(
  profile: ReturnType<typeof makeLearnerProfile> | null,
): ILearnerProfileRepository {
  return {
    findByUserId: () => Promise.resolve(profile),
    findById: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('not used')),
    countByRole: () => Promise.reject(new Error('only the admin roster counts roles')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };
}

function lessonsWithCompleted(completed: readonly number[]): ILessonRepository {
  return {
    findById: () => Promise.resolve(null),
    findOpenForDay: () => Promise.resolve(null),
    findCompletedDayIndexes: () => Promise.resolve(completed),
    create: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };
}

function useCase(options: {
  readonly currentDay: number;
  readonly completed: readonly number[];
  readonly days?: readonly ProgramDay[];
}): GetProgramOverviewUseCase {
  const program: IProgramRepository = {
    findDay: () => Promise.resolve(null),
    listDays: () =>
      Promise.resolve(options.days ?? [day(1), day(2), day(3), day(4), day(5)]),
  };

  return new GetProgramOverviewUseCase(
    profilesReturning(
      makeLearnerProfile({ id: 'p1', currentDayIndex: DayIndex.of(options.currentDay) }),
    ),
    program,
    lessonsWithCompleted(options.completed),
  );
}

describe('GetProgramOverviewUseCase', () => {
  it('unlocks every day up to and including the one the learner has reached', async () => {
    const overview = await useCase({ currentDay: 3, completed: [] }).execute({ userId: 'u1' });

    expect(overview.days.map((entry) => entry.isUnlocked)).toStrictEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it('keeps a completed day unlocked — review is the first stage of every lesson', async () => {
    const overview = await useCase({ currentDay: 3, completed: [1, 2] }).execute({ userId: 'u1' });
    const first = overview.days[0];

    expect(first?.isComplete).toBe(true);
    expect(first?.isUnlocked).toBe(true);
  });

  it('counts distinct completed days, not sessions', async () => {
    // The repository can legitimately return the same day twice — a learner who
    // reopened day 2 has two closed sessions on it.
    const overview = await useCase({ currentDay: 3, completed: [1, 2, 2, 1] }).execute({
      userId: 'u1',
    });

    expect(overview.completedDays).toBe(2);
  });

  it('reports the track and its length rather than the number of days listed', async () => {
    const overview = await useCase({ currentDay: 1, completed: [], days: [day(1)] }).execute({
      userId: 'u1',
    });

    expect(overview.track).toBe('standard28');
    expect(overview.totalDays).toBe(28);
    expect(overview.days).toHaveLength(1);
  });

  it('throws ProfileNotFoundError rather than returning an empty programme', async () => {
    const useCaseWithoutProfile = new GetProgramOverviewUseCase(
      profilesReturning(null),
      { findDay: () => Promise.resolve(null), listDays: () => Promise.resolve([]) },
      lessonsWithCompleted([]),
    );

    await expect(useCaseWithoutProfile.execute({ userId: 'ghost' })).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});
