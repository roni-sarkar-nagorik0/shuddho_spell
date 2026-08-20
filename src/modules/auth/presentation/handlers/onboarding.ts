import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { type CompleteOnboardingUseCase } from '../../application/use-cases/complete-onboarding';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import {
  completeOnboardingBodySchema,
  type CompleteOnboardingBody,
} from '../dto/onboarding-requests';

/** `GET /api/v1/onboarding` — what is stored, so an abandoned run resumes. */
export function createGetOnboardingHandler(
  useCase: () => CompleteOnboardingUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi(async ({ user }) => {
    if (user === null) {
      throw ApiError.unauthenticated();
    }

    try {
      return await useCase().read(user.userId);
    } catch (caught: unknown) {
      if (caught instanceof ProfileNotFoundError) {
        throw ApiError.notFound('Your learner profile');
      }
      throw caught;
    }
  });
}

/**
 * `POST /api/v1/onboarding` — the learner's choices, written once.
 *
 * A second call is not an error and does not overwrite: the use case returns
 * the stored state unchanged. That is what lets the wizard finish twice — a
 * double-click, a retry after a flaky connection — without a learner's track
 * quietly changing under them.
 */
export function createCompleteOnboardingHandler(
  useCase: () => CompleteOnboardingUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<CompleteOnboardingBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          track: body.track,
          dailyMinutes: body.dailyMinutes,
          accentPreference: body.accentPreference,
        });
      } catch (caught: unknown) {
        if (caught instanceof ProfileNotFoundError) {
          throw ApiError.notFound('Your learner profile');
        }
        throw caught;
      }
    },
    {
      bodySchema: completeOnboardingBodySchema,
      rateLimit: { key: 'auth:onboarding', limit: 20, windowSeconds: 60 },
    },
  );
}
