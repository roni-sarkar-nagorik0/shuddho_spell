import { ApiError } from '@/lib/api/problem';

/** Reads get three attempts in total. Beyond that the network is not flaky, it is down. */
const MAX_READ_ATTEMPTS = 3;

/**
 * A 4xx is the server saying no, and asking again does not change its mind. A
 * 429 is the exception: it is the server saying *not yet*, which is exactly the
 * case a retry is for.
 */
function isWorthRetrying(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return true;
  }

  return error.status === 429 || error.status >= 500;
}

export function retryReads(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_READ_ATTEMPTS && isWorthRetrying(error);
}

/**
 * **Writes are never retried. Exam writes especially.**
 *
 * `13-frontend.md` is explicit and gives the reason: a retried write that lands
 * after the deadline produces a support ticket, not a saved answer. The same
 * hazard applies to a lesson attempt credited twice, so the default for every
 * mutation is `false` rather than a list of exempted ones — an opt-out list is
 * a list somebody forgets to add to.
 *
 * This is a named constant rather than a bare `false` so the intent survives a
 * reader who has not read the doc, and so a search for "retry" finds the
 * decision rather than a literal.
 */
export const NEVER_RETRY = false;
