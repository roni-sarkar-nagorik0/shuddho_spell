import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type GetProgramOverviewUseCase } from '../../application/use-cases/get-program-overview';

/**
 * `GET /api/v1/program` — the 28-tile overview.
 *
 * A factory, because the use case is built per request in the composition root
 * and `presentation` may not reach into it. Protected by omission: `withApi`
 * says nothing about auth, which is what "required" looks like.
 */
export function createGetProgramHandler(
  useCase: () => GetProgramOverviewUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi(async ({ user }) => {
    if (user === null) {
      throw ApiError.unauthenticated();
    }

    try {
      return await useCase().execute({ userId: user.userId });
    } catch (caught: unknown) {
      if (caught instanceof ProfileNotFoundError) {
        throw ApiError.notFound('Your learner profile');
      }
      throw caught;
    }
  });
}
