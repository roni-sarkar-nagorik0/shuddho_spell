import { z } from 'zod';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { RuleFamily } from '../../domain/entities/rule-family';

/**
 * The counts are enforced in three places now — 002's check constraint, this
 * schema, and the entity's constructor. Not redundancy: the constraint guards
 * what reaches storage, the schema guards what a malformed row can do to a
 * request, and the entity guards content assembled in memory that never went
 * near the database.
 */
const rowSchema = z.object({
  id: z.string(),
  code: z.string(),
  statement: z.string(),
  examples: z.array(z.string()).length(3),
  counterexamples: z.array(z.string()).length(2),
});

export const RULE_FAMILY_COLUMNS = 'id, code, statement, examples, counterexamples';

export function toRuleFamilies(rows: readonly unknown[]): readonly RuleFamily[] {
  return parseRows(rowSchema, rows).map(
    (parsed) =>
      new RuleFamily(parsed.id, parsed.code, parsed.statement, parsed.examples, parsed.counterexamples),
  );
}

export function toRuleFamilyRow(family: RuleFamily): Readonly<Record<string, unknown>> {
  return {
    id: family.id,
    code: family.code,
    statement: family.statement,
    examples: [...family.examples],
    counterexamples: [...family.counterexamples],
  };
}
