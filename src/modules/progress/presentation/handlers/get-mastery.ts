import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type GetMasterySnapshotUseCase } from '../../application/use-cases/get-mastery-snapshot';

/** `GET /api/v1/progress/mastery` — the matrix. */
export function createGetMasteryHandler(
  useCase: () => GetMasterySnapshotUseCase,
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
