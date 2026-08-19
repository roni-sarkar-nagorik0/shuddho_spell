/**
 * `public.program_days` — 002_content_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IProgramDayRow {
  readonly id: string;
  readonly track: string;
  readonly day_index: number;
  readonly week_index: number;
  readonly title: string;
  readonly description: string;
  readonly estimated_minutes: number;
  readonly created_at: string;
  readonly updated_at: string;
}
