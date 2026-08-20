/**
 * F13.1 — `lessons/application` was the single weakest module in the tree:
 * **0% of 532 lines**, and it holds the session lifecycle the whole product
 * runs on.
 *
 * These cover the three claims that are invisible to a typechecker and
 * expensive when wrong: that starting a day **resumes** rather than inserts a
 * second session, that a stale or skipping stage move is refused, and that a
 * session belonging to somebody else is indistinguishable from one that does
 * not exist.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeLearnerProfile } from '@/modules/auth/domain/entities/learner-profile.fixture';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { DayLockedError } from '@/modules/program/domain/errors/day-locked.error';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { LessonSession } from '../../domain/entities/lesson-session';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';
import { type ILessonRepository } from '../../domain/repositories/lesson-repository';
import { type LessonStage } from '../../domain/value-objects/lesson-stage';
import { AdvanceLessonStageUseCase } from './advance-lesson-stage';
import { StartLessonSessionUseCase } from './start-lesson-session';

const NOW = new Date('2026-08-20T09:00:00Z');

const clock: IClock = { now: () => NOW };
const ids: IIdGenerator = { next: () => 'generated-id' };

function session(options: {
  readonly id?: string;
  readonly profileId?: string;
  readonly dayIndex?: number;
  readonly stage?: LessonStage;
}): LessonSession {
  return new LessonSession({
    id: options.id ?? 's1',
    profileId: options.profileId ?? 'p1',
    dayIndex: DayIndex.of(options.dayIndex ?? 3),
    stage: options.stage ?? 'review',
    startedAt: NOW,
    completedAt: null,
    itemsTotal: 4,
    itemsCorrect: 3,
  });
}

function profiles(options: { readonly currentDay?: number; readonly missing?: boolean }): ILearnerProfileRepository {
  return {
    findByUserId: () =>
      Promise.resolve(
        options.missing === true
          ? null
          : makeLearnerProfile({ id: 'p1', currentDayIndex: DayIndex.of(options.currentDay ?? 5) }),
      ),
    findById: () => Promise.reject(new Error('not used')),
    listAll: () => Promise.reject(new Error('not used')),
    insertIfAbsent: () => Promise.reject(new Error('not used')),
    save: () => Promise.reject(new Error('not used')),
  };
}

describe('StartLessonSessionUseCase', () => {
  it('resumes an open session instead of inserting a second one', async () => {
    const create = vi.fn();
    const open = session({ id: 'existing', stage: 'dictate' });

    const lessons: ILessonRepository = {
      findById: () => Promise.resolve(null),
      findOpenForDay: () => Promise.resolve(open),
      findCompletedDayIndexes: () => Promise.resolve([]),
      create: () => { create(); return Promise.reject(new Error('must not insert')); },
      save: (value) => Promise.resolve(value),
    };

    const result = await new StartLessonSessionUseCase(
      profiles({}), lessons, clock, ids,
    ).execute({ userId: 'u1', dayIndex: 3 });

    expect(result.resumed).toBe(true);
    expect(result.sessionId).toBe('existing');
    // The learner who closed the tab at `dictate` comes back to `dictate`.
    expect(result.stage).toBe('dictate');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a session at the first rung of the ladder when none is open', async () => {
    const lessons: ILessonRepository = {
      findById: () => Promise.resolve(null),
      findOpenForDay: () => Promise.resolve(null),
      findCompletedDayIndexes: () => Promise.resolve([]),
      create: (value) => Promise.resolve(value),
      save: (value) => Promise.resolve(value),
    };

    const result = await new StartLessonSessionUseCase(
      profiles({}), lessons, clock, ids,
    ).execute({ userId: 'u1', dayIndex: 3 });

    expect(result.resumed).toBe(false);
    expect(result.sessionId).toBe('generated-id');
    expect(result.stage).toBe('review');
    expect(result.itemsTotal).toBe(0);
  });

  it('refuses a day the learner has not reached', async () => {
    const lessons: ILessonRepository = {
      findById: () => Promise.resolve(null),
      findOpenForDay: () => Promise.reject(new Error('must not look for a session on a locked day')),
      findCompletedDayIndexes: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('not used')),
      save: () => Promise.reject(new Error('not used')),
    };

    await expect(
      new StartLessonSessionUseCase(profiles({ currentDay: 2 }), lessons, clock, ids).execute({
        userId: 'u1',
        dayIndex: 3,
      }),
    ).rejects.toBeInstanceOf(DayLockedError);
  });

  it('throws ProfileNotFoundError before touching a session', async () => {
    const lessons: ILessonRepository = {
      findById: () => Promise.resolve(null),
      findOpenForDay: () => Promise.reject(new Error('not used')),
      findCompletedDayIndexes: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('not used')),
      save: () => Promise.reject(new Error('not used')),
    };

    await expect(
      new StartLessonSessionUseCase(profiles({ missing: true }), lessons, clock, ids).execute({
        userId: 'ghost',
        dayIndex: 1,
      }),
    ).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});

function advanceOver(stored: LessonSession | null): AdvanceLessonStageUseCase {
  const lessons: ILessonRepository = {
    findById: () => Promise.resolve(stored),
    findOpenForDay: () => Promise.resolve(null),
    findCompletedDayIndexes: () => Promise.resolve([]),
    create: () => Promise.reject(new Error('not used')),
    save: (value) => Promise.resolve(value),
  };

  return new AdvanceLessonStageUseCase(profiles({}), lessons);
}

describe('AdvanceLessonStageUseCase', () => {
  it('moves one rung forward', async () => {
    const result = await advanceOver(session({ stage: 'review' })).execute({
      userId: 'u1',
      sessionId: 's1',
      toStage: 'learn',
    });

    expect(result.stage).toBe('learn');
  });

  it('refuses a skip — the named target is what makes that detectable', async () => {
    await expect(
      advanceOver(session({ stage: 'review' })).execute({
        userId: 'u1',
        sessionId: 's1',
        toStage: 'build',
      }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('refuses a stale request from a tab that is behind', async () => {
    // The session is already at `speak`; a double-tap sends `dictate`. With a
    // "next" API this would silently push the learner to `build`.
    await expect(
      advanceOver(session({ stage: 'speak' })).execute({
        userId: 'u1',
        sessionId: 's1',
        toStage: 'dictate',
      }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('treats another learner’s session as one that does not exist', async () => {
    await expect(
      advanceOver(session({ profileId: 'someone-else' })).execute({
        userId: 'u1',
        sessionId: 's1',
        toStage: 'learn',
      }),
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it('throws SessionNotFoundError for an id that resolves to nothing', async () => {
    await expect(
      advanceOver(null).execute({ userId: 'u1', sessionId: 'nope', toStage: 'learn' }),
    ).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});
