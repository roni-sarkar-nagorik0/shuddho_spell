import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type SubmitExamAttemptUseCase } from '../../application/use-cases/submit-exam-attempt';
import { attemptParamsSchema, type IAttemptParams } from '../dto/exam-requests';
import { toApiError } from './exam-errors';

/**
 * `POST /api/v1/exams/attempts/:id/submit`.
 *
 * The response carries the score, the outcome, the section breakdown, the day
 * the learner is on now and how many drills a failure prescribed — but no
 * correct answer. The review endpoint is the only route that returns those, and
 * only after this has run.
 */
export function createSubmitAttemptHandler(
  useCase: () => SubmitExamAttemptUseCase,
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
      rateLimit: { key: 'exams:submit-attempt', limit: 20, windowSeconds: 60 },
    },
  );
}
