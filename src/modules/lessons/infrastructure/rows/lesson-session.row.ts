/**
 * `public.lesson_sessions` — 003_learner_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface ILessonSessionRow {
  readonly id: string;
  readonly profile_id: string;
  readonly day_index: number;
  readonly stage: string;
  readonly started_at: string;
  /** Null while the session is still open. */
  readonly completed_at: string | null;
  readonly items_total: number;
  readonly items_correct: number;
  readonly created_at: string;
  readonly updated_at: string;
}
