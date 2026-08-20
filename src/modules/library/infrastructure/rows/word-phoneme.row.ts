/**
 * `public.word_phonemes` — 002_content_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IWordPhonemeRow {
  readonly id: string;
  readonly word_id: string;
  readonly phoneme_id: string;
  /** 0-based position within the word. */
  readonly position: number;
  readonly created_at: string;
  readonly updated_at: string;
}
