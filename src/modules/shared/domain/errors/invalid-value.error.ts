/**
 * A value object was handed something it cannot represent.
 *
 * Thrown rather than returned as an `IResult`, and the distinction matters:
 * every value in this application arrives through a Zod parse at the edge, so
 * a `DayIndex` of 99 is not a learner mistake the domain should model — it is
 * a bug in the code that built it. `IResult` is for failures a caller can
 * sensibly handle; this is one it cannot.
 *
 * Typed rather than a bare `Error` so the boundary filter can map it to a 500
 * deliberately instead of pattern-matching a message.
 */
export class InvalidValueError extends Error {
  constructor(
    /** The value object that refused, e.g. `DayIndex`. */
    readonly valueObject: string,
    /** What was rejected, already stringified — never interpolated raw. */
    readonly received: string,
    /** The rule it broke, in words a reader can act on. */
    readonly requirement: string,
  ) {
    super(`${valueObject} cannot be ${received}: ${requirement}`);
    this.name = 'InvalidValueError';
  }
}
