/**
 * No review item with that id belongs to this learner, or it is not due.
 *
 * One error for all three cases — no such item, somebody else's item, an item
 * not currently due — for the reason `SessionNotFoundError` conflates its two:
 * telling them apart turns the endpoint into an oracle for which ids exist.
 */
export class ReviewItemNotFoundError extends Error {
  constructor(readonly reviewItemId: string) {
    super(`no review item ${reviewItemId} due for this learner`);
    this.name = 'ReviewItemNotFoundError';
  }
}
