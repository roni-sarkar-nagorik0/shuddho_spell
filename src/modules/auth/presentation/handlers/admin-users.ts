import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type ListUsersUseCase } from '../../application/use-cases/list-users';
import { type SetUserRoleUseCase } from '../../application/use-cases/set-user-role';
import { LastAdminError } from '../../domain/errors/last-admin.error';
import { NotAnAdminError } from '../../domain/errors/not-an-admin.error';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import {
  setUserRoleBodySchema,
  userParamsSchema,
  type ISetUserRoleBody,
  type IUserParams,
} from '../dto/admin-users.response';

/**
 * The three domain failures these two endpoints can produce, mapped once.
 *
 * `NotAnAdminError` becomes a **403 and not a 404**. Hiding the route from a
 * signed-in learner would be security theatre — they can read the same page
 * source everybody else can, and the answer they need is "you are not allowed",
 * not a lie about the URL. What actually protects the roster is that the use
 * case reads the caller's role from the database before it reads anything else.
 */
function toApiError(caught: unknown): ApiError | null {
  if (caught instanceof NotAnAdminError) {
    return ApiError.forbidden();
  }

  if (caught instanceof ProfileNotFoundError) {
    return ApiError.notFound('That user');
  }

  if (caught instanceof LastAdminError) {
    return ApiError.conflict(
      'This is the only admin left. Make somebody else an admin first, then remove this one.',
    );
  }

  return null;
}

/** `GET /api/v1/admin/users`. */
export function createListUsersHandler(
  useCase: () => ListUsersUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi(async ({ user }) => {
    if (user === null) {
      throw ApiError.unauthenticated();
    }

    try {
      return await useCase().execute({ userId: user.userId });
    } catch (caught: unknown) {
      throw toApiError(caught) ?? caught;
    }
  });
}

/** `PATCH /api/v1/admin/users/:id/role`. */
export function createSetUserRoleHandler(
  useCase: () => SetUserRoleUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<ISetUserRoleBody, undefined, IUserParams>(
    async ({ user, body, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          // The actor is the session's, never the body's. A request that could
          // name who it was acting as would be the whole permission model
          // handed to the caller.
          actorUserId: user.userId,
          profileId: params.id,
          role: body.role,
        });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: setUserRoleBodySchema,
      paramsSchema: userParamsSchema,
      // A write, so it is limited — `11-api-surface.md`. Low, because there is
      // no legitimate use that changes roles quickly and a compromised admin
      // session should not be able to rewrite the whole roster in a second.
      rateLimit: { key: 'admin:set-user-role', limit: 20, windowSeconds: 60 },
    },
  );
}
