import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type GetExamResultUseCase } from '../../application/use-cases/get-exam-result';
import { attemptParamsSchema, type IAttemptParams } from '../dto/exam-requests';
import { toApiError } from './exam-errors';

/**
 * `GET /api/v1/exams/attempts/:id/result`.
 *
 * Separate from the review because they answer different questions and the
 * result screen must not have to download 150 questions and their answer key to
 * show one number.
 */
export function createGetResultHandler(
  useCase: () => GetExamResultUseCase,
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
      rateLimit: { key: 'exams:result', limit: 60, windowSeconds: 60 },
    },
  );
}
