import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { StreakRecord } from '@/modules/progress/domain/entities/streak-record';
import { type IStreakRepository } from '@/modules/progress/domain/repositories/streak-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { type IUnitOfWork } from '@/modules/shared/application/ports/unit-of-work';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';
import { type ILessonRepository } from '../../domain/repositories/lesson-repository';

export interface ICompleteLessonSessionInput {
  readonly userId: string;
  readonly sessionId: string;
}

export interface ICompleteLessonSessionOutput {
  readonly sessionId: string;
  readonly itemsTotal: number;
  readonly itemsCorrect: number;
  readonly currentDayIndex: number;
  readonly currentStreak: number;
}

/**
 * Closes a day and moves everything that closing a day moves.
 *
 * Four writes: the session, the learner's position, the streak, and nothing
 * else — mastery and review items are written by the attempt use cases as
 * answers arrive, not batched up until the end, because a learner who abandons
 * a lesson at `speak` should still have their earlier answers counted.
 *
 * All of it inside one `IUnitOfWork`. A failure between the session closing and
 * the streak registering leaves a learner who finished a day and lost their
 * streak — silent, permanent, and the sort of thing that is only noticed weeks
 * later when the number is wrong.
 */
export class CompleteLessonSessionUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
    private readonly streaks: IStreakRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: ICompleteLessonSessionInput): Promise<ICompleteLessonSessionOutput> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const session = await this.lessons.findById(input.sessionId);

    if (session === null || session.profileId !== profile.id) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const now = this.clock.now();

    return this.unitOfWork.run(async () => {
      // The entity refuses to complete from anywhere but the last stage, so a
      // learner cannot finish a day they have not spoken or built a sentence in.
      const completed = await this.lessons.save(session.complete(now));

      // Only advances when the finished day *is* where the learner is. A
      // learner revisiting day 3 to practise has not earned day 5.
      const moved =
        completed.dayIndex.value === profile.currentDayIndex.value
          ? await this.profiles.save(profile.advanceDay())
          : profile;

      const existing = await this.streaks.findByProfile(profile.id);

      const streak = await this.streaks.save(
        (
          existing ??
          new StreakRecord({
            id: this.ids.next(),
            profileId: profile.id,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: null,
            freezesRemaining: 0,
          })
        ).registerActivity(now, profile.timezone),
      );

      return {
        sessionId: completed.id,
        itemsTotal: completed.itemsTotal,
        itemsCorrect: completed.itemsCorrect,
        currentDayIndex: moved.currentDayIndex.value,
        currentStreak: streak.currentStreak,
      };
    });
  }
}
