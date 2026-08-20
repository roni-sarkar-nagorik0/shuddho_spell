import { ApiError } from '@/lib/api/problem';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { ExamAttemptsExhaustedError } from '../../domain/errors/exam-attempts-exhausted.error';
import { ExamCooldownActiveError } from '../../domain/errors/exam-cooldown-active.error';
import { ExamLockedError } from '../../domain/errors/exam-locked.error';
import { ExamTimeExpiredError } from '../../domain/errors/exam-time-expired.error';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { IllegalAttemptTransitionError } from '../../domain/errors/illegal-attempt-transition.error';
import { SectionNotCurrentError } from '../../domain/errors/section-not-current.error';

/**
 * The one mapping from an exam domain error to a status.
 *
 * Shared by every exam handler so they cannot disagree, and deliberately not a
 * business conditional: nothing here decides whether an action is allowed, it
 * translates a decision the domain already made.
 *
 * The statuses are chosen apart on purpose. A locked exam is **403** — it
 * exists, the learner will reach it, and a 404 would be a lie they could
 * disprove by opening the catalogue. An illegal transition is **409** — the
 * request was well formed and the attempt is simply finished, which is the
 * shape of a replayed submit rather than a malformed one.
 */
export function toApiError(caught: unknown): ApiError | null {
  if (caught instanceof ExamNotFoundError) {
    return ApiError.notFound('That exam');
  }

  if (caught instanceof ExamLockedError) {
    return ApiError.forbidden();
  }

  if (caught instanceof ExamAttemptsExhaustedError) {
    return ApiError.examAttemptsExhausted(
      `You have used all ${String(caught.maxAttempts)} attempts at this exam.`,
    );
  }

  if (caught instanceof ExamCooldownActiveError) {
    // The remaining time is in the detail because rule 5 asks for it there:
    // "come back later" with no number reads as a bug.
    return ApiError.examCooldownActive(
      `This exam can be retaken in ${formatWait(caught.remainingSeconds)}, from ${caught.retryAt.toISOString()}.`,
    );
  }

  if (caught instanceof ExamTimeExpiredError) {
    // Its own code, not a plain conflict: the runtime has to stop the clock and
    // stop accepting input, and it cannot tell that from a replayed request
    // without being told.
    return ApiError.examTimeExpired(
      'Time is up for this exam. Nothing further can be saved on this attempt.',
    );
  }

  if (caught instanceof IllegalAttemptTransitionError || caught instanceof SectionNotCurrentError) {
    return ApiError.conflict(caught.message);
  }

  if (caught instanceof ProfileNotFoundError) {
    return ApiError.notFound('Your learner profile');
  }

  return null;
}

/** Hours and minutes, because "43,187 seconds" is not something anybody waits. */
function formatWait(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);

  if (hours === 0) {
    return `${String(minutes)} minutes`;
  }

  return minutes === 0
    ? `${String(hours)} hours`
    : `${String(hours)} hours and ${String(minutes)} minutes`;
}
