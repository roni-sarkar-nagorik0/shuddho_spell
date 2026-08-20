import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type SubmitConstructionAttemptUseCase } from '../../application/use-cases/submit-construction-attempt';
import { type SubmitDictationAttemptUseCase } from '../../application/use-cases/submit-dictation-attempt';
import { type SubmitPronunciationAttemptUseCase } from '../../application/use-cases/submit-pronunciation-attempt';
import {
  sessionParamsSchema,
  submitAttemptBodySchema,
  type ISessionParams,
  type SubmitAttemptBody,
} from '../dto/lesson-requests';
import { toApiError } from './lesson-errors';

export interface ISubmitAttemptUseCases {
  readonly dictation: SubmitDictationAttemptUseCase;
  readonly pronunciation: SubmitPronunciationAttemptUseCase;
  readonly construction: SubmitConstructionAttemptUseCase;
}

/**
 * `POST /api/v1/lessons/sessions/:id/attempts`.
 *
 * The `switch` on `mode` is **routing, not a business rule**: it picks which
 * use case runs, and neither branch decides anything about the answer. Zod has
 * already narrowed the body to one shape or the other, so there is no third
 * case to handle and no default to invent.
 *
 * A higher ceiling than starting a session — `11-api-surface.md` says as much
 * about exam answers, and the reasoning carries: a learner working through
 * twenty words quickly is a learner working, not an attacker.
 */
export function createSubmitAttemptHandler(
  useCases: () => ISubmitAttemptUseCases,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<SubmitAttemptBody, undefined, ISessionParams>(
    async ({ user, body, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        const cases = useCases();

        switch (body.mode) {
          case 'dictation':
            return await cases.dictation.execute({
              userId: user.userId,
              sessionId: params.id,
              wordId: body.wordId,
              submittedValue: body.submittedValue,
              latencyMs: body.latencyMs,
            });
          case 'pronunciation':
            return await cases.pronunciation.execute({
              userId: user.userId,
              sessionId: params.id,
              wordId: body.wordId,
              transcript: body.transcript,
              heardPhonemes: body.heardPhonemes,
              latencyMs: body.latencyMs,
            });
          case 'construction':
            return await cases.construction.execute({
              userId: user.userId,
              sessionId: params.id,
              sentenceItemId: body.sentenceItemId,
              submittedValue: body.submittedValue,
              latencyMs: body.latencyMs,
            });
        }
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: submitAttemptBodySchema,
      paramsSchema: sessionParamsSchema,
      rateLimit: { key: 'lessons:submit-attempt', limit: 120, windowSeconds: 60 },
    },
  );
}
