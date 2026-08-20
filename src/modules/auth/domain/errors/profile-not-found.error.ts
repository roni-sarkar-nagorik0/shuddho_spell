/**
 * A verified session with no profile behind it. Typed rather than a bare Error
 * so the boundary can map it deliberately instead of guessing from a message.
 *
 * F3.9's reconciler runs on every sign-in, so reaching this means the profile
 * was removed after the session was issued.
 */
export class ProfileNotFoundError extends Error {
  constructor(readonly userId: string) {
    super(`no learner profile for ${userId}`);
    this.name = 'ProfileNotFoundError';
  }
}
