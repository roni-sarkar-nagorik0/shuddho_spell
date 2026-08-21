/**
 * `public.demo_attempts` — 021_demo_attempts.sql
 *
 * Hand-written from the SQL, never generated. This interface must not leave
 * `infrastructure/`.
 */
export interface IDemoAttemptRow {
  readonly id: string;
  readonly profile_id: string;
  readonly word_id: string;
  readonly submitted_value: string;
  /** Server-decided via `Word.matches`; the client never sends it. */
  readonly is_correct: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}
