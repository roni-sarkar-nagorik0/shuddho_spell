import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type StartExamAttemptUseCase } from '../../application/use-cases/start-exam-attempt';
import { examCodeParamsSchema, type IExamCodeParams } from '../dto/exam-requests';
import { toApiError } from './exam-errors';

/**
 * `POST /api/v1/exams/:code/attempts`.
 *
 * POST rather than PUT even though it is idempotent in effect — a second call
 * returns the running attempt rather than creating a second one. The
 * idempotence is the *domain's* (`findActive` first, and 004's partial unique
 * index behind it), not the verb's, and pretending otherwise would suggest the
 * client may retry freely. It may, but because the engine is careful, not
 * because HTTP said so.
 *
 * A low ceiling. Starting an exam is a once-an-hour act at most, and a flood of
 * starts is either a bug or an attack on the one-live-attempt index.
 */
export function createStartAttemptHandler(
  useCase: () => StartExamAttemptUseCase,
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
      rateLimit: { key: 'exams:start-attempt', limit: 10, windowSeconds: 60 },
    },
  );
}
