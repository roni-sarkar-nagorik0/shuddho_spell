/**
 * `public.review_items` — 003_learner_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IReviewItemRow {
  readonly id: string;
  readonly profile_id: string;
  readonly item_id: string;
  readonly item_type: string;
  /** Position on the interval ladder. The ladder itself is a domain service. */
  readonly interval_index: number;
  readonly due_at: string;
  readonly times_seen: number;
  readonly times_correct: number;
  readonly consecutive_correct: number;
  /** A `date`, not a timestamp: it is the learner-local day, already resolved. */
  readonly last_correct_on: string | null;
  readonly is_mastered: boolean;
  readonly last_error_tags: readonly string[];
  readonly created_at: string;
  readonly updated_at: string;
}
