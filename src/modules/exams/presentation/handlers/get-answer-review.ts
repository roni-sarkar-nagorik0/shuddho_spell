import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type GetExamAnswerReviewUseCase } from '../../application/use-cases/get-exam-answer-review';
import { attemptParamsSchema, type IAttemptParams } from '../dto/exam-requests';
import { toApiError } from './exam-errors';

/**
 * `GET /api/v1/exams/attempts/:id/review` — **the only route in the product
 * that returns correct answers**, and only after the paper is in.
 *
 * The guard is in the use case rather than here, deliberately. A check in a
 * handler protects one handler; a check before the read protects the data, and
 * an unsubmitted attempt never loads its answer key into memory at all.
 */
export function createGetAnswerReviewHandler(
  useCase: () => GetExamAnswerReviewUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<undefined, undefined, IAttemptParams>(
    async ({ user, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, attemptId: params.id });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      paramsSchema: attemptParamsSchema,
      rateLimit: { key: 'exams:review', limit: 60, windowSeconds: 60 },
    },
  );
}
