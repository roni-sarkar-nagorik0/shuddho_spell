export const CLOCK = Symbol('CLOCK');

/**
 * The only source of "now" in the application layer.
 *
 * A use case that calls `Date.now()` cannot be tested: every assertion about a
 * due date, a streak boundary or a session's age becomes a race with the wall
 * clock, and the tests that matter most here — the ones about midnight in
 * Dhaka — cannot be written at all. Injecting the clock makes "it is 23:50 on
 * the 19th" a parameter rather than a thing you wait for.
 *
 * `01-architecture.md` states it as a hard rule: a use case never calls
 * `Date.now()`. F4.10's grep is what enforces it.
 */
export interface IClock {
  readonly now: () => Date;
}
