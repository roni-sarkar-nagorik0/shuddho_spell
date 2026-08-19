/**
 * The signed-in learner, as every layer sees them.
 *
 * Assembled from the server-verified session and the profile it owns — never
 * from a request body, a query parameter or a header. If a value here did not
 * come from `requireUser()`, `withApi`'s `user` or the provider those two feed,
 * it is not identity, whatever it is called.
 *
 * One interface, both sides of the wire. `04-authentication.md` names the
 * Client Component's return `ISessionUser`; it is this, because the client is
 * handed exactly what the server verified and nothing else. A second name would
 * only invite a second, looser shape.
 */
export interface IAuthenticatedUser {
  /** `auth.users.id`. The identity Supabase verified. */
  readonly userId: string;
  /** `learner_profiles.id`. What every learner-owned row is keyed by. */
  readonly profileId: string;
  readonly email: string;
  readonly displayName: string;
}
