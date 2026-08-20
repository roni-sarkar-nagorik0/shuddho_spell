import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { type StartLessonSessionUseCase } from '../../application/use-cases/start-lesson-session';
import { startSessionBodySchema, type IStartSessionBody } from '../dto/lesson-requests';
import { toApiError } from './lesson-errors';

/**
 * `POST /api/v1/lessons/sessions`.
 *
 * Rate limited, per `11-api-surface.md`'s "rate limits on every write route".
 * The ceiling is generous because a learner opening a lesson twice is normal —
 * this is a guard against a script, not against a person.
 */
export function createStartSessionHandler(
  useCase: () => StartLessonSessionUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<IStartSessionBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, dayIndex: body.dayIndex });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: startSessionBodySchema,
      rateLimit: { key: 'lessons:start-session', limit: 30, windowSeconds: 60 },
    },
  );
}
