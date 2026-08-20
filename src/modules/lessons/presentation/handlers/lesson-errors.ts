import { ApiError } from '@/lib/api/problem';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { DayLockedError } from '@/modules/program/domain/errors/day-locked.error';
import { IllegalStageTransitionError } from '../../domain/errors/illegal-stage-transition.error';
import { ItemNotInLessonError } from '../../domain/errors/item-not-in-lesson.error';
import { SessionAlreadyCompletedError } from '../../domain/errors/session-already-completed.error';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';

/**
 * The one mapping from a lesson domain error to a status.
 *
 * Shared by the three lesson handlers so they cannot disagree about what a
 * stage violation is. It is **not** a business conditional — nothing here
 * decides whether an action is allowed, it only translates a decision the
 * domain already made into HTTP.
 */
export function toApiError(caught: unknown): ApiError | null {
  if (caught instanceof SessionNotFoundError) {
    // 404 for "not yours" as well as "not there". Telling them apart would
    // confirm which session ids exist.
    return ApiError.notFound('That lesson session');
  }

  if (caught instanceof IllegalStageTransitionError || caught instanceof SessionAlreadyCompletedError) {
    // 409: the request is well-formed and the session is simply not in a state
    // where it makes sense. A 422 would say the input was malformed, and it
    // was not.
    return ApiError.conflict(caught.message);
  }

  if (caught instanceof ItemNotInLessonError) {
    return ApiError.notFound('That item in today’s lesson');
  }

  if (caught instanceof DayLockedError) {
    return ApiError.forbidden();
  }

  if (caught instanceof ProfileNotFoundError) {
    return ApiError.notFound('Your learner profile');
  }

  return null;
}
