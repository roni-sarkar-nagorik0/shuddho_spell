/**
 * `public.exam_definitions` — 004_exam_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IExamDefinitionRow {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly duration_seconds: number;
  readonly question_count: number;
  /** `numeric(5,2)` — a 79.999 that should pass at 80 is a real bug. */
  readonly pass_percent: number | null;
  readonly max_attempts: number | null;
  readonly cooldown_hours: number | null;
  readonly unlock_day_standard: number;
  readonly unlock_day_sprint: number;
  readonly created_at: string;
  readonly updated_at: string;
}
