export const REVIEW_SCHEDULING_POLICY = Symbol('REVIEW_SCHEDULING_POLICY');

/**
 * The interval ladder, behind an interface so it can be swapped and tested.
 *
 * **Nothing outside the implementation knows the numbers.** `ReviewItem` asks
 * this for its next rung and its next due date; it does not know how many rungs
 * there are or how long any of them last. That is what makes the ladder a
 * product decision one file can change.
 *
 * Two deliberate departures from the sketch in `06-spaced-repetition.md`, both
 * recorded in `ARCHITECTURE.md`:
 *
 * 1. `nextIntervalIndex` is here as well as `nextInterval`. The doc says a
 *    correct answer advances one rung "capped at rung 4", which is a fact about
 *    the ladder's length — and the ladder's length is exactly what the entity
 *    is not allowed to know.
 * 2. `nextDueAt` takes a `timezone`. The doc's own signature omits it while the
 *    prose two lines above requires the due date to land on the learner's day
 *    boundary rather than the submission instant. The signature cannot deliver
 *    what the prose asks for, so the parameter is added.
 */
export interface IReviewSchedulingPolicy {
  /** Days until this rung comes round again. */
  readonly nextInterval: (intervalIndex: number, isCorrect: boolean) => number;

  /** The rung a result moves to: one up capped at the top, or all the way to 0. */
  readonly nextIntervalIndex: (intervalIndex: number, isCorrect: boolean) => number;

  /** The moment it next falls due, at the learner's day boundary. */
  readonly nextDueAt: (
    intervalIndex: number,
    isCorrect: boolean,
    now: Date,
    timezone: string,
  ) => Date;

  /** Whether this many correct answers, spread this widely, is mastery. */
  readonly isMastered: (consecutiveCorrect: number, distinctDays: number) => boolean;
}
