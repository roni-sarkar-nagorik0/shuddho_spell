/**
 * `public.program_day_items` — 002_content_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IProgramDayItemRow {
  readonly id: string;
  readonly program_day_id: string;
  readonly item_type: string;
  /** Points at a word, a sentence item or a rule family, per `item_type`. */
  readonly item_id: string;
  readonly order_index: number;
  readonly created_at: string;
  readonly updated_at: string;
}
