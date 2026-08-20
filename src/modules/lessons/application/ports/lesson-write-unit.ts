import { type Attempt } from '../../domain/entities/attempt';
import { type LessonSession } from '../../domain/entities/lesson-session';
import { type MasteryRecord } from '@/modules/progress/domain/entities/mastery-record';
import { type StreakRecord } from '@/modules/progress/domain/entities/streak-record';
import { type ReviewItem } from '@/modules/review/domain/entities/review-item';

export const LESSON_WRITE_UNIT = Symbol('LESSON_WRITE_UNIT');

/** Everything one answer changes. */
export interface IAttemptWrite {
  readonly attempt: Attempt;
  readonly reviewItem: ReviewItem | null;
  readonly mastery: readonly MasteryRecord[];
}

/** Everything finishing a day changes. */
export interface ISessionCompletionWrite {
  readonly session: LessonSession;
  readonly streak: StreakRecord;
  /**
   * The day to move the learner to, or null to leave them where they are.
   *
   * Null is the revisit case: a learner practising day 3 again has not earned
   * day 8. Deciding it in the use case and passing null keeps the rule in the
   * domain rather than teaching the database what a revisit is.
   */
  readonly advanceToDayIndex: number | null;
}

/**
 * The writes that must not half-happen.
 *
 * **This port replaces `IUnitOfWork`, which could not be built.** A callback
 * unit of work assumes the caller can open a transaction and run arbitrary
 * statements inside it. Supabase speaks PostgREST: every call is its own HTTP
 * request and therefore its own transaction, and no amount of TypeScript
 * arranges four of them into one. `run(work)` would have compiled, run, and
 * silently provided no atomicity at all — a lie in a type, which is worse than
 * the missing feature.
 *
 * So the shape changed to fit what a database can actually promise. Each method
 * here is one Postgres function call: the domain has already decided every
 * value, and the function writes them together or not at all. See
 * `03-database.md` and 009's own comment — "the transaction is the point, not
 * the arithmetic".
 */
export interface ILessonWriteUnit {
  /** One answer: the attempt, the session counters, the ladder, the mastery. */
  readonly recordAttempt: (write: IAttemptWrite) => Promise<void>;

  /** Finishing a day: the session, and the streak it moved. */
  readonly completeSession: (write: ISessionCompletionWrite) => Promise<void>;
}
