import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { zonedDayStart } from '@/modules/shared/domain/value-objects/zoned-day-start';
import { type IReviewSchedulingPolicy } from './review-scheduling-policy';

/**
 * **The only place in this codebase that knows these five numbers.**
 *
 * Grep for `1, 3, 7, 16, 35` — a hit in a use case, a handler or a component is
 * a bug, and `06-spaced-repetition.md` says so outright. Keeping them here is
 * what makes the schedule a product decision that changes in one file rather
 * than an assumption spread across a feature.
 */
const INTERVAL_DAYS: readonly number[] = Object.freeze([1, 3, 7, 16, 35]);

const FIRST_RUNG = 0;
const TOP_RUNG = INTERVAL_DAYS.length - 1;

/** Three correct answers, on three different calendar days. */
const MASTERY_CORRECT_ANSWERS = 3;
const MASTERY_DISTINCT_DAYS = 3;

/**
 * Deterministic spaced repetition. No ease factors, no floating-point drift, no
 * per-item divergence that cannot be explained to a learner in one sentence:
 * get it right and it comes back later, get it wrong and it comes back
 * tomorrow.
 */
export class IntervalLadderPolicy implements IReviewSchedulingPolicy {
  nextInterval(intervalIndex: number, isCorrect: boolean): number {
    const days = INTERVAL_DAYS[this.nextIntervalIndex(intervalIndex, isCorrect)];

    // Unreachable: nextIntervalIndex clamps into range. Narrowed rather than
    // asserted, because `!` is banned and the first rung is the safe answer.
    return days ?? INTERVAL_DAYS[FIRST_RUNG] ?? 1;
  }

  nextIntervalIndex(intervalIndex: number, isCorrect: boolean): number {
    if (!isCorrect) {
      // All the way down, not one rung back. A learner who has forgotten an
      // item at 35 days has forgotten it, and re-earning the ladder is the
      // only honest way back up.
      return FIRST_RUNG;
    }

    return Math.min(Math.max(intervalIndex, FIRST_RUNG) + 1, TOP_RUNG);
  }

  /**
   * When the item next falls due — at the **start of a learner-local day**, not
   * at an instant `n × 24h` after submission.
   *
   * The difference is the product. An item answered at 21:00 and due "in one
   * day" should be waiting in tomorrow morning's session, not appear at 21:00
   * tomorrow evening after the learner has finished. Anchoring to the local
   * midnight also means the interval survives travel: a due date is a day, and
   * a day is whatever the learner's zone says it is.
   */
  nextDueAt(intervalIndex: number, isCorrect: boolean, now: Date, timezone: string): Date {
    const today = LocalDate.fromInstant(now, timezone);
    const dueOn = new Date(Date.parse(`${today.value}T00:00:00Z`));
    dueOn.setUTCDate(dueOn.getUTCDate() + this.nextInterval(intervalIndex, isCorrect));

    const isoDate = dueOn.toISOString().slice(0, 'YYYY-MM-DD'.length);

    return zonedDayStart(isoDate, timezone);
  }

  /**
   * Mastery is three correct answers spread over three different days.
   *
   * Both numbers are checked even though the caller increments one per day,
   * because the interface promises to judge the pair it is given and a future
   * caller counting differently must not be able to buy mastery in a session.
   */
  isMastered(consecutiveCorrect: number, distinctDays: number): boolean {
    return consecutiveCorrect >= MASTERY_CORRECT_ANSWERS && distinctDays >= MASTERY_DISTINCT_DAYS;
  }
}
