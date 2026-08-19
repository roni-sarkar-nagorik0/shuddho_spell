import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type GetDueReviewItemsUseCase } from '../../application/use-cases/get-due-review-items';

/** `GET /api/v1/review/due` — today's queue, already capped and ordered. */
export function createGetDueHandler(
  useCase: () => GetDueReviewItemsUseCase,
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
