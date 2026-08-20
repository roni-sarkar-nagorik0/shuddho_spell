/**
 * No notification by that id, or none the learner owns.
 *
 * One error for both, deliberately: telling them apart would confirm which
 * notification ids exist, and a notification id is a guessable-looking uuid
 * attached to somebody's private message.
 */
export class NotificationNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`notification ${id} does not exist`);
    this.name = 'NotificationNotFoundError';
  }
}
