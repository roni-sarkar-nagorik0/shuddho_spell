import { InvalidValueError } from '../errors/invalid-value.error';

/** The longest track is 28 days; `sprint21` ends earlier but shares the type. */
const MIN_DAY = 1;
const MAX_DAY = 28;

/**
 * A position in the programme, 1-based.
 *
 * This exists instead of `number` because day zero and day 29 are the two
 * mistakes this codebase would otherwise keep making — 003 guards them at the
 * database and nothing guarded them in between. A `DayIndex` that exists is a
 * day that exists.
 *
 * The upper bound is the longest track's length, not the learner's. Whether
 * day 25 is past the end is a question about `sprint21`, and the entity holding
 * the track answers it; a value object cannot, because it does not know one.
 */
export class DayIndex {
  private constructor(readonly value: number) {}

  static of(value: number): DayIndex {
    if (!Number.isInteger(value)) {
      throw new InvalidValueError('DayIndex', String(value), 'must be a whole number');
    }

    if (value < MIN_DAY || value > MAX_DAY) {
      throw new InvalidValueError(
        'DayIndex',
        String(value),
        `must be between ${String(MIN_DAY)} and ${String(MAX_DAY)}`,
      );
    }

    return new DayIndex(value);
  }

  /** The day after this one, or `null` at the end of the longest track. */
  next(): DayIndex | null {
    return this.value === MAX_DAY ? null : new DayIndex(this.value + 1);
  }

  /** 1-based, seven days to a week: days 1–7 are week 1. */
  weekIndex(): number {
    return Math.ceil(this.value / 7);
  }

  equals(other: DayIndex): boolean {
    return this.value === other.value;
  }
}
