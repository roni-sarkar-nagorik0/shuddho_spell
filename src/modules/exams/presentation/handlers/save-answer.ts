import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type FlagExamQuestionUseCase } from '../../application/use-cases/flag-exam-question';
import { type SaveExamAnswerUseCase } from '../../application/use-cases/save-exam-answer';
import {
  attemptParamsSchema,
  saveAnswerBodySchema,
  type IAttemptParams,
  type SaveAnswerBody,
} from '../dto/exam-requests';
import { toApiError } from './exam-errors';

export interface ISaveAnswerUseCases {
  readonly save: SaveExamAnswerUseCase;
  readonly flag: FlagExamQuestionUseCase;
}

/**
 * `PATCH /api/v1/exams/attempts/:id/answers`.
 *
 * The `switch` is routing, not a rule: Zod has already narrowed the body to one
 * shape or the other and neither branch decides anything about the answer.
 *
 * A high ceiling, on purpose. A learner working through 150 questions and
 * changing their mind is a learner working — and `13-frontend.md` is explicit
 * that **exam writes are never retried** by the client, so a rate limit that
 * bit here would lose an answer outright rather than delay it.
 */
export function createSaveAnswerHandler(
  useCases: () => ISaveAnswerUseCases,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<SaveAnswerBody, undefined, IAttemptParams>(
    async ({ user, body, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        const cases = useCases();

        switch (body.action) {
          case 'answer':
            return await cases.save.execute({
              userId: user.userId,
              attemptId: params.id,
              questionId: body.questionId,
              submittedValue: body.submittedValue,
              timeSpentMs: body.timeSpentMs,
            });
          case 'flag':
            return await cases.flag.execute({
              userId: user.userId,
              attemptId: params.id,
              questionId: body.questionId,
              flagged: body.flagged,
            });
        }
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: saveAnswerBodySchema,
      paramsSchema: attemptParamsSchema,
      rateLimit: { key: 'exams:save-answer', limit: 300, windowSeconds: 60 },
    },
  );
}
