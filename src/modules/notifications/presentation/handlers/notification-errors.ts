import { PROBLEM_CODES } from '@/contracts';
import { ApiError } from '@/lib/api/problem';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';
import { NotificationNotFoundError } from '../../domain/errors/notification-not-found.error';

/**
 * The one mapping from a notification domain error to a status.
 *
 * `NotificationNotFoundError` is 404 for "not there" **and** for "not yours",
 * because distinguishing them would confirm which notification ids exist and a
 * notification is somebody's private message.
 */
export function toApiError(caught: unknown): ApiError | null {
  if (caught instanceof NotificationNotFoundError) {
    return ApiError.notFound('That notification');
  }

  if (caught instanceof ProfileNotFoundError) {
    return ApiError.notFound('Your learner profile');
  }

  if (caught instanceof InvalidValueError) {
    // A quiet-hour string the schema let through but the value object refuses.
    // 422, because the body is what was wrong.
    return new ApiError(422, PROBLEM_CODES.VALIDATION_FAILED, caught.message);
  }

  return null;
}
