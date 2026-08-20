/**
 * `public.mastery_records` — 003_learner_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IMasteryRecordRow {
  readonly id: string;
  readonly profile_id: string;
  /** `phoneme` or `rule_family` — the two dimensions of the mastery matrix. */
  readonly dimension: string;
  readonly dimension_id: string;
  readonly attempts: number;
  readonly correct: number;
  /** `numeric(5,2)`, written by MasteryCalculator, never computed in SQL. */
  readonly accuracy: number;
  readonly last_updated_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}
