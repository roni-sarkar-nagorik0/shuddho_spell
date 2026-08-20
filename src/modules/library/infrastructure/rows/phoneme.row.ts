/**
 * `public.phonemes` — 002_content_tables.sql, seeded by 010_seed_reference.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IPhonemeRow {
  readonly id: string;
  /** Bare IPA, no slash delimiters. */
  readonly symbol: string;
  readonly type: string;
  /** Null means Bangla lacks the sound — meaningful data, not a missing value. */
  readonly bangla_equivalent: string | null;
  readonly articulation_note: string;
  readonly common_bengali_substitution: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
