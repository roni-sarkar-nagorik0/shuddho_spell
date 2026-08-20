import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type AdvanceLessonStageUseCase } from '../../application/use-cases/advance-lesson-stage';
import {
  advanceStageBodySchema,
  sessionParamsSchema,
  type IAdvanceStageBody,
  type ISessionParams,
} from '../dto/lesson-requests';
import { toApiError } from './lesson-errors';

/** `PATCH /api/v1/lessons/sessions/:id/stage`. */
export function createAdvanceStageHandler(
  useCase: () => AdvanceLessonStageUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<IAdvanceStageBody, undefined, ISessionParams>(
    async ({ user, body, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          sessionId: params.id,
          toStage: body.toStage,
        });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: advanceStageBodySchema,
      paramsSchema: sessionParamsSchema,
      rateLimit: { key: 'lessons:advance-stage', limit: 60, windowSeconds: 60 },
    },
  );
}
