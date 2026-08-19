/**
 * `public.attempts` — 003_learner_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IAttemptRow {
  readonly id: string;
  readonly session_id: string;
  /** Denormalised from the session so an RLS policy never has to join. */
  readonly profile_id: string;
  readonly item_type: string;
  readonly item_id: string;
  readonly mode: string;
  readonly submitted_value: string;
  readonly is_correct: boolean;
  /** `numeric(5,2)` — never a float. */
  readonly score: number;
  readonly error_tags: readonly string[];
  readonly latency_ms: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}
