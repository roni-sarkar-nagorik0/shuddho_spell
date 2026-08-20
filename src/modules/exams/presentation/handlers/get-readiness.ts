import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type GetExamReadinessUseCase } from '../../application/use-cases/get-exam-readiness';
import { examCodeParamsSchema, type IExamCodeParams } from '../dto/exam-requests';
import { toApiError } from './exam-errors';

/**
 * `GET /api/v1/exams/:code/readiness`.
 *
 * A prediction, and it says so — `predictedScorePercent`, not `score`. The
 * lobby is allowed to be encouraging and is not allowed to be wrong: a screen
 * that says *Ready!* to somebody who will score 51% is worse than one that says
 * nothing, because they will believe it.
 */
export function createGetReadinessHandler(
  useCase: () => GetExamReadinessUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<undefined, undefined, IExamCodeParams>(
    async ({ user, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, code: params.code });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      paramsSchema: examCodeParamsSchema,
      rateLimit: { key: 'exams:readiness', limit: 60, windowSeconds: 60 },
    },
  );
}
