import { type MasteryRecord } from '@/modules/progress/domain/entities/mastery-record';
import { toMasteryRecordRow } from '@/modules/progress/infrastructure/mappers/mastery-record.mapper';
import { toStreakRecordRow } from '@/modules/progress/infrastructure/mappers/streak-record.mapper';
import { toReviewItemRow } from '@/modules/review/infrastructure/mappers/review-item.mapper';
import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { toAttemptRow } from '../mappers/attempt.mapper';
import {
  type IAttemptWrite,
  type ILessonWriteUnit,
  type ISessionCompletionWrite,
} from '../../application/ports/lesson-write-unit';

/**
 * Two Postgres functions, 013 and 009.
 *
 * The rows are built by the same mappers every repository uses, so the shape
 * the function receives and the shape a plain write would produce cannot drift
 * apart. `profile_id` is sent and then **ignored** by both functions — each one
 * re-derives it from the session row it locks, so a payload naming somebody
 * else's profile writes nothing to that profile.
 */
export class SupabaseLessonWriteUnit implements ILessonWriteUnit {
  constructor(private readonly db: IDatabase) {}

  async recordAttempt(write: IAttemptWrite): Promise<void> {
    await this.db.rpc('record_lesson_attempt', {
      p_session_id: write.attempt.sessionId,
      p_attempt: toAttemptRow(write.attempt),
      p_review_item: write.reviewItem === null ? null : toReviewItemRow(write.reviewItem),
      p_mastery: this.masteryRows(write.mastery),
    });
  }

  /**
   * 014's `complete_lesson_day`, not 009's `complete_lesson_session`.
   *
   * The difference is `p_current_day_index`. Attempts, review items and mastery
   * were written answer by answer as the learner worked — a lesson abandoned at
   * `speak` keeps the work it did — so completion has only the session, the
   * streak and the learner's position left to move, and the position is the one
   * 009 could not reach.
   *
   * A null day index means "do not advance": the learner revisited a day they
   * had already finished, and finishing day 3 again must not move them on from
   * day 7.
   */
  async completeSession(write: ISessionCompletionWrite): Promise<void> {
    await this.db.rpc('complete_lesson_day', {
      p_session_id: write.session.id,
      p_items_total: write.session.itemsTotal,
      p_items_correct: write.session.itemsCorrect,
      p_streak: toStreakRecordRow(write.streak),
      p_current_day_index: write.advanceToDayIndex,
    });
  }

  private masteryRows(records: readonly MasteryRecord[]): readonly unknown[] {
    return records.map(toMasteryRecordRow);
  }
}
