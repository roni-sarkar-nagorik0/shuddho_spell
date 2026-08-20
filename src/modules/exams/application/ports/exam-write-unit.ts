import { type ExamAttempt } from '../../domain/entities/exam-attempt';
import { type ExamQuestion } from '../../domain/entities/exam-question';

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
export interface IExamWriteUnit {
  /** Returns the attempt id the database settled on. */
  readonly startAttempt: (write: IAttemptStartWrite) => Promise<string>;
}
