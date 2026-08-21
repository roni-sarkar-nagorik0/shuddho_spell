import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { MissingReferenceError } from '@/modules/shared/domain/errors/missing-reference.error';
import { type RecordDemoAttemptUseCase } from '../../application/use-cases/record-demo-attempt';
import {
  recordDemoAttemptBodySchema,
  type IRecordDemoAttemptBody,
} from '../dto/demo-attempt-requests';

/**
 * `POST /api/v1/demo/attempts` — one demo answer, from a signed-in learner.
 *
 * **Session required**, unlike the word endpoint beside it. Reading a word is
 * the public half of the demo; writing a row against a person is not, and an
 * anonymous caller has no profile to write against. The demo simply does not
 * call this when nobody is signed in.
 */
export function createRecordDemoAttemptHandler(
  useCase: () => RecordDemoAttemptUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<IRecordDemoAttemptBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          wordId: body.wordId,
          submittedValue: body.submittedValue,
        });
      } catch (caught: unknown) {
        if (caught instanceof MissingReferenceError) {
          throw ApiError.notFound('That word');
        }

        if (caught instanceof ProfileNotFoundError) {
          throw ApiError.notFound('Your learner profile');
        }

        throw caught;
      }
    },
    {
      bodySchema: recordDemoAttemptBodySchema,
      // A write, so it is limited. Generous, because a learner working through
      // the demo quickly is the behaviour this is here to record.
      rateLimit: { key: 'demo:record-attempt', limit: 120, windowSeconds: 60 },
    },
  );
}
