/**
 * `public.rule_families` — 002_content_tables.sql, seeded by 010_seed_reference.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IRuleFamilyRow {
  readonly id: string;
  readonly code: string;
  readonly statement: string;
  /** Exactly three, enforced by `rule_families_examples_count`. */
  readonly examples: readonly string[];
  /** Exactly two, enforced by `rule_families_counterexamples_count`. */
  readonly counterexamples: readonly string[];
  readonly created_at: string;
  readonly updated_at: string;
}
