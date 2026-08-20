import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type IStreakRepository } from '../../domain/repositories/streak-repository';
import { type ILearnerDashboard } from '../dto/learner-dashboard';

export interface IGetLearnerDashboardInput {
  readonly userId: string;
}

/**
 * The one read behind the dashboard.
 *
 * **Five queries, always five.** One for the profile, then four in parallel —
 * today's day, any open session, the due count, the streak. None of them loops
 * and none of them grows with how much the learner has done: the due count is a
 * `count`, not a fetch-and-length, and the open session is looked up by day
 * rather than by scanning a history. The Phase 5 exit gate asserts the query
 * count for exactly this reason.
 *
 * A Server Component calls this directly through the composition root. There is
 * no HTTP hop, no serialisation and no second implementation — the route
 * handler exists for TanStack Query, and both run this.
 */
export class GetLearnerDashboardUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly program: IProgramRepository,
    private readonly lessons: ILessonRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly streaks: IStreakRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetLearnerDashboardInput): Promise<ILearnerDashboard> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const now = this.clock.now();

    const [day, openSession, dueReviewCount, streak] = await Promise.all([
      this.program.findDay(profile.track, profile.currentDayIndex),
      this.lessons.findOpenForDay(profile.id, profile.currentDayIndex),
      this.reviews.countDue(profile.id, now),
      this.streaks.findByProfile(profile.id),
    ]);

    const today = LocalDate.fromInstant(now, profile.timezone);

    return {
      displayName: profile.displayName,
      currentDayIndex: profile.currentDayIndex.value,
      totalDays: profile.totalDays(),
      currentStreak: streak?.currentStreak ?? 0,
      streakIsAlive: streak?.isAliveOn(today) ?? false,
      dueReviewCount,
      // Null rather than an error when the day has no content. A learner whose
      // seed is incomplete should still see their streak and their reviews, not
      // a dashboard that refuses to render.
      today:
        day === null
          ? null
          : {
              dayIndex: day.dayIndex.value,
              title: day.title,
              estimatedMinutes: day.estimatedMinutes,
              inProgress: openSession !== null,
              stage: openSession?.stage ?? null,
            },
      hasFinishedProgram: profile.hasFinishedProgram(),
    };
  }
}
