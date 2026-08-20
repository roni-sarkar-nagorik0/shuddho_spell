/**
 * A signed-in learner asked for something only an admin may have.
 *
 * Typed rather than a boolean returned to the caller, because "may this person
 * see the roster" is not a question a presentation layer should be able to
 * forget to ask. The use case answers it before it reads anything, and the
 * boundary maps this to 403.
 */
export class NotAnAdminError extends Error {
  constructor(readonly userId: string) {
    super(`${userId} is not an admin`);
    this.name = 'NotAnAdminError';
  }
}
