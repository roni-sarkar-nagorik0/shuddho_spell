import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type GetActiveExamAttemptUseCase } from '../../application/use-cases/get-active-exam-attempt';
import { toApiError } from './exam-errors';

/**
 * `GET /api/v1/exams/attempts/active`.
 *
 * Returns `null` rather than 404 when nothing is running. The runtime calls
 * this on every load to ask "am I mid-exam?", and "no" is a legitimate answer
 * to that question rather than a missing resource.
 */
export function createGetActiveAttemptHandler(
  useCase: () => GetActiveExamAttemptUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi(
    async ({ user }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    { rateLimit: { key: 'exams:active-attempt', limit: 120, windowSeconds: 60 } },
  );
}
