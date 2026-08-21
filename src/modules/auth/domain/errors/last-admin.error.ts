/**
 * The demotion that would leave nobody in charge.
 *
 * Roles are only grantable by an admin, so an application with no admin left
 * cannot make one — the only way back is a hand-written `update` against the
 * database. That makes "demote the last admin" not a mistake to warn about
 * afterwards but one to refuse, and refusing it is a rule about the set of
 * users rather than about any one of them, which is why it lives here and is
 * checked by the use case that can see the count.
 */
export class LastAdminError extends Error {
  constructor(readonly profileId: string) {
    super(`${profileId} is the only admin left and cannot be demoted`);
    this.name = 'LastAdminError';
  }
}
