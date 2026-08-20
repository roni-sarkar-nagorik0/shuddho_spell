/**
 * A completed session was asked to change.
 *
 * Separate from an illegal transition because the cause is different and so is
 * the fix: nothing is wrong with the stage being asked for, the session is
 * simply over. A retried request after a successful completion is the common
 * way here, and it must not silently reopen the day.
 */
export class SessionAlreadyCompletedError extends Error {
  constructor(readonly sessionId: string) {
    super(`lesson session ${sessionId} is already complete`);
    this.name = 'SessionAlreadyCompletedError';
  }
}
