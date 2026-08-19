/**
 * `public.exam_sections` — 004_exam_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IExamSectionRow {
  readonly id: string;
  readonly definition_id: string;
  readonly code: string;
  readonly weight: number;
  readonly order_index: number;
  readonly question_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}
