/**
 * A learner submitted an answer for something today's lesson does not contain.
 *
 * `05-domain-model.md` makes this a mandatory case, and it is not hypothetical:
 * the item id is in the request body, so any client can send any id. Without
 * this check a learner could grind a single easy word to mastery, or answer
 * day 27's vocabulary on day 2 and skew every mastery number they have.
 */
export class ItemNotInLessonError extends Error {
  constructor(
    readonly itemId: string,
    readonly dayIndex: number,
  ) {
    super(`item ${itemId} is not part of day ${String(dayIndex)}`);
    this.name = 'ItemNotInLessonError';
  }
}
