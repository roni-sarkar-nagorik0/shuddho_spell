import { type NextRequest, type NextResponse } from 'next/server';
import { type GetMeUseCase } from '../../application/use-cases/get-me';
import { type LearnerProfile } from '../../domain/entities/learner-profile';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { type IMeResponse } from '../dto/me.response';

function toResponse(user: { readonly email: string }, profile: LearnerProfile): IMeResponse {
  return {
    userId: profile.userId,
    profileId: profile.id,
    // The address on the session, not a copy stored in the profile — there is
    // no second place for it to go stale.
    email: user.email,
    displayName: profile.displayName,
    program: {
      track: profile.track,
      currentDayIndex: profile.currentDayIndex.value,
      totalDays: profile.totalDays(),
      hasOnboarded: profile.hasOnboarded(),
    },
  };
}

/**
 * A factory rather than a handler, because the use case is built per request in
 * the composition root and `presentation` may not reach into it.
 *
 * The route is protected by omission: `withApi` says nothing about auth here,
 * which is what "required" looks like (F3.7).
 */
export function createGetMeHandler(
  useCase: () => GetMeUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi(async ({ user }) => {
    if (user === null) {
      // Unreachable: withApi has already answered 401. Narrowing rather than
      // asserting, because `!` is banned and a lie in a type is worse than a
      // branch that never runs.
      throw ApiError.unauthenticated();
    }

    try {
      const profile = await useCase().execute({ userId: user.userId });
      return toResponse(user, profile);
    } catch (caught: unknown) {
      if (caught instanceof ProfileNotFoundError) {
        throw ApiError.notFound('Your learner profile');
      }
      throw caught;
    }
  });
}
