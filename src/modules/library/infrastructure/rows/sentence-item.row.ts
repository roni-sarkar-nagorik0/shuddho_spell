/**
 * `public.sentence_items` — 002_content_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface ISentenceItemRow {
  readonly id: string;
  readonly bangla_text: string;
  readonly english_text: string;
  /** Empty means the target is the only accepted answer. */
  readonly accepted_alternatives: readonly string[];
  readonly distractor_words: readonly string[];
  readonly grammar_rule_family_ids: readonly string[];
  readonly difficulty: string;
  readonly created_at: string;
  readonly updated_at: string;
}
