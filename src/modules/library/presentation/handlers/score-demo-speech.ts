import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { MissingReferenceError } from '@/modules/shared/domain/errors/missing-reference.error';
import { type ScoreDemoSpeechUseCase } from '../../application/use-cases/score-demo-speech';
import { demoSpeechBodySchema, type IDemoSpeechBody } from '../dto/demo-speech.request';

/**
 * `POST /api/v1/demo/speech` — one spoken attempt, marked, for a visitor with
 * no account.
 *
 * **Public**, like the word endpoint beside it and unlike `demo/attempts`. The
 * distinction those two already draw is the right one: reading and marking are
 * public, *writing a row against a person* is not. This writes nothing, so
 * there is nothing here that needs a profile — and the whole promise of the
 * front door is "try it, no account needed", which a pronunciation demo behind
 * a sign-up would not be.
 *
 * **It receives a transcript and never audio.** The browser transcribes; only
 * the text is posted. That is `07-speech-scoring.md`'s constraint and it is a
 * property of the schema, not of anyone's discipline.
 *
 * Rate-limited harder than the word endpoint. This one loads three tables and
 * runs the confusion map, and it is anonymous.
 */
export function createScoreDemoSpeechHandler(
  useCase: () => ScoreDemoSpeechUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<IDemoSpeechBody>(
    async ({ body }) => {
      try {
        return await useCase().execute({
          wordId: body.wordId,
          transcript: body.transcript,
          mode: body.mode,
        });
      } catch (caught: unknown) {
        if (caught instanceof MissingReferenceError) {
          throw ApiError.notFound('That word');
        }

        throw caught;
      }
    },
    {
      auth: 'public',
      bodySchema: demoSpeechBodySchema,
      rateLimit: { key: 'demo:speech', limit: 40, windowSeconds: 60 },
    },
  );
}
