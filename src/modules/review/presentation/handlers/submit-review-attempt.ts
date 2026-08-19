import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type SubmitReviewAttemptUseCase } from '../../application/use-cases/submit-review-attempt';
import { ReviewItemNotFoundError } from '../../domain/errors/review-item-not-found.error';
import { submitReviewBodySchema, type ISubmitReviewBody } from '../dto/review-requests';

/** `POST /api/v1/review/attempts`. */
export function createSubmitReviewAttemptHandler(
  useCase: () => SubmitReviewAttemptUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<ISubmitReviewBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          reviewItemId: body.reviewItemId,
          submittedValue: body.submittedValue,
        });
      } catch (caught: unknown) {
        if (caught instanceof ReviewItemNotFoundError) {
          // 404 covers "not yours" and "not due" as well as "no such item" —
          // the use case conflates them and so does this.
          throw ApiError.notFound('That review item');
        }
        if (caught instanceof ProfileNotFoundError) {
          throw ApiError.notFound('Your learner profile');
        }
        throw caught;
      }
    },
    {
      bodySchema: submitReviewBodySchema,
      rateLimit: { key: 'review:submit-attempt', limit: 120, windowSeconds: 60 },
    },
  );
}
