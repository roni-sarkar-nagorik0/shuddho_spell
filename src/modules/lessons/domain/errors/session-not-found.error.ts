/**
 * No session with that id belongs to this learner.
 *
 * **One error for both "no such session" and "somebody else's session".** That
 * is deliberate: distinguishing them turns the endpoint into an oracle that
 * confirms which session ids exist, and a learner has no legitimate use for
 * that answer. `04-authentication.md` takes the same line with sign-in
 * failures.
 */
export class SessionNotFoundError extends Error {
  constructor(readonly sessionId: string) {
    super(`no lesson session ${sessionId} for this learner`);
    this.name = 'SessionNotFoundError';
  }
}
