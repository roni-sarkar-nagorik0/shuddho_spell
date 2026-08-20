import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { NotAnAdminError } from '../../domain/errors/not-an-admin.error';
import { type ILearnerProfileRepository } from '../../domain/repositories/learner-profile-repository';
import { toUserSummary, type IUserRoster } from '../dto/user-summary';

export interface IListUsersInput {
  /** `auth.users.id` of the caller, from the verified session and nowhere else. */
  readonly userId: string;
}

/**
 * The cap, restated from the port's own reasoning.
 *
 * `listAll` is the only read in the application that walks the whole table, and
 * it is bounded for a reason. A roster longer than this needs a paginated read
 * — a keyset query like the library's — not a larger constant here.
 */
const ROSTER_LIMIT = 500;

/**
 * Everybody, for an admin.
 *
 * The permission check is the first thing it does and it is done against the
 * **database's** copy of the caller's role, not against anything the request
 * carried. A handler cannot forget to ask, and a client cannot answer.
 *
 * There is no `profileId` input and no filter: an admin gets the roster or a
 * 403, and there is no third shape of this call that could be talked into
 * returning one specific learner to somebody who is not one.
 */
export class ListUsersUseCase {
  constructor(private readonly profiles: ILearnerProfileRepository) {}

  async execute(input: IListUsersInput): Promise<IUserRoster> {
    const caller = await this.profiles.findByUserId(input.userId);

    if (caller === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    if (!caller.isAdmin()) {
      throw new NotAnAdminError(input.userId);
    }

    const everyone = await this.profiles.listAll(ROSTER_LIMIT);

    // Newest first, and sorted here rather than in the query. `listAll` exists
    // for the hourly notification job, which does not care about order; adding
    // an ordering to the port for one screen's benefit would widen a seam that
    // is deliberately narrow, and 500 rows is not a sort worth a round trip.
    const users = [...everyone]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map((profile) => toUserSummary(profile, caller.id));

    return {
      users,
      totalUsers: users.length,
      totalAdmins: users.filter((user) => user.role === 'admin').length,
    };
  }
}
