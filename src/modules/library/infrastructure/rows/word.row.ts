/**
 * `public.words` — 002_content_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IWordRow {
  readonly id: string;
  readonly text: string;
  readonly ipa: string;
  readonly syllables: readonly string[];
  readonly bangla_sound: string;
  readonly bangla_meaning: string;
  readonly part_of_speech: string;
  /** Nullable: a word need not belong to a rule family. */
  readonly rule_family_id: string | null;
  readonly week_index: number;
  readonly frequency_rank: number | null;
  readonly common_misspellings: readonly string[];
  readonly created_at: string;
  readonly updated_at: string;
}
