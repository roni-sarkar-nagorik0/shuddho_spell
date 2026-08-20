import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type SubmitExamSectionUseCase } from '../../application/use-cases/submit-exam-section';
import { sectionParamsSchema, type ISectionParams } from '../dto/exam-requests';
import { toApiError } from './exam-errors';

/**
 * `POST /api/v1/exams/attempts/:id/sections/:code/submit`.
 *
 * There is no counterpart. No `DELETE`, no `PATCH` that moves a section back,
 * and none can be written without first adding a method to `ExamAttempt` that
 * lowers the index — which is where rule 4 is actually enforced.
 */
export function createSubmitSectionHandler(
  useCase: () => SubmitExamSectionUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<undefined, undefined, ISectionParams>(
    async ({ user, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          attemptId: params.id,
          sectionCode: params.code,
        });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      paramsSchema: sectionParamsSchema,
      rateLimit: { key: 'exams:submit-section', limit: 30, windowSeconds: 60 },
    },
  );
}
