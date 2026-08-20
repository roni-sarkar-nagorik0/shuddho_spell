/**
 * Supabase verified a session, but no `learner_profiles` row backs it.
 *
 * The signup trigger in 009 creates that row in the same transaction as the
 * `auth.users` insert, so this is an impossible state rather than a user error,
 * and F3.9's idempotent bootstrap is what closes the last gap.
 *
 * It is loud on purpose. Treating it as "signed out" would redirect a genuinely
 * signed-in learner to `/login`, where they would sign in successfully and
 * arrive back here — a loop with no exit and no explanation.
 *
 * Its own file, with no imports: `SessionBoundary` has to catch it, and a test
 * has to construct it, without dragging the Supabase client along behind.
 */
export class MissingProfileError extends Error {
  constructor(userId: string) {
    super(`session for ${userId} has no learner profile — the signup trigger did not run`);
    this.name = 'MissingProfileError';
  }
}
