import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';

const REQUIRED_EXAMPLES = 3;
const REQUIRED_COUNTEREXAMPLES = 2;

/**
 * One spelling or grammar rule, with the evidence that makes it teachable.
 *
 * The counts are not arbitrary and they are not the database's business alone:
 * 002 enforces exactly three examples and exactly two counterexamples because a
 * rule with no counterexample teaches a false absolute. A learner told "i before
 * e" without "weird" and "seize" has learned something wrong. Guarding it here
 * as well means content assembled in memory — a seeder, a test, a fixture —
 * cannot build a rule that would be rejected on the way to storage.
 */
export class RuleFamily {
  constructor(
    readonly id: string,
    /** Stable slug — `doubling`, `drop_the_e`. The seeder's natural key. */
    readonly code: string,
    readonly statement: string,
    readonly examples: readonly string[],
    readonly counterexamples: readonly string[],
  ) {
    if (examples.length !== REQUIRED_EXAMPLES) {
      throw new InvalidValueError(
        'RuleFamily',
        `${String(examples.length)} examples`,
        `must have exactly ${String(REQUIRED_EXAMPLES)}`,
      );
    }

    if (counterexamples.length !== REQUIRED_COUNTEREXAMPLES) {
      throw new InvalidValueError(
        'RuleFamily',
        `${String(counterexamples.length)} counterexamples`,
        `must have exactly ${String(REQUIRED_COUNTEREXAMPLES)} — a rule with none teaches a false absolute`,
      );
    }
  }
}
