import { LastAdminError } from '../../domain/errors/last-admin.error';
import { NotAnAdminError } from '../../domain/errors/not-an-admin.error';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '../../domain/repositories/learner-profile-repository';
import { type UserRole } from '../../domain/value-objects/user-role';
import { toUserSummary, type IUserSummary } from '../dto/user-summary';

export interface ISetUserRoleInput {
  /** The caller's `auth.users.id`, from the verified session. */
  readonly actorUserId: string;
  /** Whose role is changing — a `learner_profiles.id`, not a user id. */
  readonly profileId: string;
  readonly role: UserRole;
}

/**
 * Promotion and demotion, which are the same operation with two arguments.
 *
 * **Only an admin can make an admin.** That is the whole access model: the
 * first account is made an admin by the database (020's `assign_first_admin`,
 * inside the insert), and every admin after that is made by one who already is.
 * There is no invite, no env var full of addresses, and no bootstrap endpoint
 * that would be a back door standing open for the life of the product.
 *
 * Two things it refuses:
 *
 *   - **The last admin cannot be demoted.** Nobody left with the right to grant
 *     the role means the only way back is a hand-written `update` against
 *     production. Checked against a live count rather than against the roster
 *     the browser was showing, which may be minutes old.
 *   - **An unknown profile.** `notFound`, not a silent success — an admin who
 *     mistypes an id should be told, not reassured.
 *
 * Demoting *yourself* is allowed as long as you are not the last one. Handing
 * over and stepping back is a real thing to want to do, and the count already
 * covers the case that makes it dangerous.
 */
export class SetUserRoleUseCase {
  constructor(private readonly profiles: ILearnerProfileRepository) {}

  async execute(input: ISetUserRoleInput): Promise<IUserSummary> {
    const actor = await this.profiles.findByUserId(input.actorUserId);

    if (actor === null) {
      throw new ProfileNotFoundError(input.actorUserId);
    }

    if (!actor.isAdmin()) {
      throw new NotAnAdminError(input.actorUserId);
    }

    const target = await this.profiles.findById(input.profileId);

    if (target === null) {
      throw new ProfileNotFoundError(input.profileId);
    }

    if (target.role === input.role) {
      // Already there. Returning the row rather than throwing makes the
      // endpoint idempotent, so a double-clicked button is not an error.
      return toUserSummary(target, actor.id);
    }

    if (target.isAdmin() && (await this.profiles.countByRole('admin')) <= 1) {
      throw new LastAdminError(target.id);
    }

    const saved = await this.profiles.save(target.withRole(input.role));

    return toUserSummary(saved, actor.id);
  }
}
