import { type ExamAttempt } from '../../domain/entities/exam-attempt';
import { type ExamQuestion } from '../../domain/entities/exam-question';
import { type ExamAnswer } from '../../domain/entities/exam-answer';
import { type ReviewItem } from '@/modules/review/domain/entities/review-item';

export const EXAM_WRITE_UNIT = Symbol('EXAM_WRITE_UNIT');

/** Everything starting an exam creates. */
export interface IAttemptStartWrite {
  readonly attempt: ExamAttempt;
  readonly questions: readonly ExamQuestion[];
}

/**
 * The exam writes that must not half-happen.
 *
 * The same shape as `ILessonWriteUnit` and for the same reason: Supabase speaks
 * PostgREST, every call is its own transaction, and no arrangement of
 * TypeScript makes two of them into one. Each method here is one Postgres
 * function.
 *
 * Starting an attempt is the sharpest case in the product. An attempt row
 * without its questions is unanswerable and unsubmittable, and 004's partial
 * unique index means it also **blocks the learner from ever starting that exam
 * again** — a dropped connection turning into a support ticket and a locked
 * milestone. 015 writes both or neither.
 */
/** Everything handing a paper in changes. */
export interface IAttemptSubmitWrite {
  /** The graded attempt — status, score, section scores, pass or fail. */
  readonly attempt: ExamAttempt;
  /** Every answer, with its mark. Written once, here, never as they type. */
  readonly answers: readonly ExamAnswer[];
  /** Rule 8's drills. Empty on a pass. */
  readonly prescription: readonly ReviewItem[];
  /**
   * The day to move the learner to, or null to leave them where they are.
   *
   * Null on a fail, on the ungraded diagnostic, and on a pass by somebody
   * already past that day. Deciding it in the domain and passing null keeps the
   * rule out of the database — the same shape `ILessonWriteUnit` settled on.
   */
  readonly advanceToDayIndex: number | null;
}

export interface IExamWriteUnit {
  /** Returns the attempt id the database settled on. */
  readonly startAttempt: (write: IAttemptStartWrite) => Promise<string>;

  /**
   * Marks, outcome, prescription and position — together or not at all.
   *
   * Every partial outcome here is worse than the failure that caused it: marks
   * with no outcome leave an attempt stuck `in_progress` past its deadline and
   * blocking the retake; an outcome with no advance leaves somebody who passed
   * the milestone still on day 7 tomorrow; a fail with no prescription is rule
   * 8's "just a number", which is the failure the product exists against.
   */
  readonly submitAttempt: (write: IAttemptSubmitWrite) => Promise<void>;
}
