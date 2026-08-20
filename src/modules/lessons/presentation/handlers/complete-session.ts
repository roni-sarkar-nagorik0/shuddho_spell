import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type CompleteLessonSessionUseCase } from '../../application/use-cases/complete-lesson-session';
import { sessionParamsSchema, type ISessionParams } from '../dto/lesson-requests';
import { toApiError } from './lesson-errors';

/**
 * `POST /api/v1/lessons/sessions/:id/complete`.
 *
 * `CompleteLessonSessionUseCase` has existed and been wired to the container
 * since Phase 5, and until F11.7 nothing could reach it — the day could be
 * walked through and never closed, so the position never moved and the streak
 * never registered. This is the missing route, not a new capability.
 *
 * No body: the session id is in the path and identity is in the session. There
 * is nothing for a client to supply, and a body would be a place to supply it.
 *
 * A low ceiling. A day closes once; a client sending this sixty times a minute
 * is a bug, and the use case is four writes inside a Postgres function.
 */
export function createCompleteSessionHandler(
  useCase: () => CompleteLessonSessionUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<undefined, undefined, ISessionParams>(
    async ({ user, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, sessionId: params.id });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      paramsSchema: sessionParamsSchema,
      rateLimit: { key: 'lessons:complete-session', limit: 20, windowSeconds: 60 },
    },
  );
}
