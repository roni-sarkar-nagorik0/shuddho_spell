import { InvalidValueError } from '../errors/invalid-value.error';

const MIN_SCORE = 0;
const MAX_SCORE = 100;
/** `numeric(5,2)` in 003 and 004 — two decimals is the storable precision. */
const DECIMAL_PLACES = 2;

/**
 * A score out of 100.
 *
 * Every scored thing in the product shares this type: a dictation attempt, a
 * pronunciation result from the speech scorer, an exam section, a mastery
 * accuracy. They are all `numeric(5,2)` in the schema, and rounding at
 * construction is what keeps a float that came back from a scoring API from
 * being stored at a precision the column cannot hold and read back different.
 */
export class ScorePercent {
  private constructor(readonly value: number) {}

  static of(value: number): ScorePercent {
    if (!Number.isFinite(value)) {
      throw new InvalidValueError('ScorePercent', String(value), 'must be a finite number');
    }

    if (value < MIN_SCORE || value > MAX_SCORE) {
      throw new InvalidValueError(
        'ScorePercent',
        String(value),
        `must be between ${String(MIN_SCORE)} and ${String(MAX_SCORE)}`,
      );
    }

    return new ScorePercent(Number(value.toFixed(DECIMAL_PLACES)));
  }

  /** A whole-number percentage, for display. Never for storage. */
  rounded(): number {
    return Math.round(this.value);
  }

  isAtLeast(threshold: ScorePercent): boolean {
    return this.value >= threshold.value;
  }
}
