/**
 * `public.exam_answers` — 004_exam_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IExamAnswerRow {
  readonly id: string;
  readonly question_id: string;
  readonly attempt_id: string;
  readonly profile_id: string;
  /** Null until the learner answers; an unanswered question still has a row. */
  readonly submitted_value: string | null;
  readonly is_correct: boolean | null;
  readonly awarded_points: number;
  readonly flagged: boolean;
  readonly answered_at: string | null;
  readonly time_spent_ms: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}
