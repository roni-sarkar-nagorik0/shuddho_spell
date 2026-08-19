/**
 * `public.streak_records` — 003_learner_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IStreakRecordRow {
  readonly id: string;
  readonly profile_id: string;
  readonly current_streak: number;
  readonly longest_streak: number;
  /** A `date`: the learner-local day, resolved before it was written. */
  readonly last_active_date: string | null;
  readonly freezes_remaining: number;
  readonly created_at: string;
  readonly updated_at: string;
}
