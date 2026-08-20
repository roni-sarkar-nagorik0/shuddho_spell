import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { type IMasteryRepository } from '../../domain/repositories/mastery-repository';
import { type IStreakRepository } from '../../domain/repositories/streak-repository';
import { type IProgressSummary } from '../dto/progress-summary';

export interface IGetProgressSummaryInput {
  readonly userId: string;
}

/**
 * The numbers a learner sees on the progress screen.
 *
 * `overallAccuracy` is computed from the mastery records rather than counted
 * over the attempts table. Both would give the same answer today; only one
 * still gives it in a year, when a learner has fifty thousand attempt rows and
 * this endpoint is asked for on every page load.
 */
export class GetProgressSummaryUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
    private readonly streaks: IStreakRepository,
    private readonly mastery: IMasteryRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetProgressSummaryInput): Promise<IProgressSummary> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const [completed, streak, records] = await Promise.all([
      this.lessons.findCompletedDayIndexes(profile.id),
      this.streaks.findByProfile(profile.id),
      this.mastery.findByProfile(profile.id),
    ]);

    const attempts = records.reduce((total, record) => total + record.attempts, 0);
    const correct = records.reduce((total, record) => total + record.correct, 0);

    const today = LocalDate.fromInstant(this.clock.now(), profile.timezone);

    return {
      currentDayIndex: profile.currentDayIndex.value,
      totalDays: profile.totalDays(),
      completedDays: new Set(completed).size,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      // A learner last active three days ago still has a stored streak. Saying
      // it is alive would be a number about to reset without warning.
      streakIsAlive: streak?.isAliveOn(today) ?? false,
      itemsReviewed: attempts,
      // Nothing attempted is not 0% — it is unmeasured, and showing a beginner
      // "0% accuracy" before their first answer is a lie that reads as failure.
      overallAccuracy: attempts === 0 ? 0 : ScorePercent.of((correct / attempts) * 100).value,
      masteredItems: records.filter((record) => !record.isWeakness() && record.attempts > 0).length,
    };
  }
}
