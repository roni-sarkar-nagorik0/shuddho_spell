/**
 * A learner asked for a day they have not reached.
 *
 * The programme is sequential by design — day 12 assumes day 11's words — so
 * this is a domain rule, not a UI affordance. The client hides the tile; the
 * client is not trusted, and a learner who edits a url must land here rather
 * than on content that will not make sense without what comes before it.
 */
export class DayLockedError extends Error {
  constructor(
    readonly dayIndex: number,
    readonly currentDayIndex: number,
  ) {
    super(
      `day ${String(dayIndex)} is locked; the learner has reached day ${String(currentDayIndex)}`,
    );
    this.name = 'DayLockedError';
  }
}
