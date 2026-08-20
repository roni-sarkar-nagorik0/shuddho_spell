import 'server-only';
import { cache } from 'react';
import { type ILearnerDashboard } from '@/modules/progress/application/dto/learner-dashboard';
import { type IProgressSummary } from '@/modules/progress/application/dto/progress-summary';
import { createContainer } from './container';
import { makeGetLearnerDashboard, makeGetProgressSummary } from './use-cases';

/**
 * The read path for Server Components.
 *
 * `11-api-surface.md`: "a read screen does **not** fetch its own API over HTTP.
 * A Server Component calls the same use case through the composition root — no
 * network hop, no serialisation, no double validation."
 *
 * These functions are the composition root's front door for a page, and they
 * call **exactly the same factories** `src/composition/handlers.ts` calls. That
 * is the whole point: not two implementations that agree today, one
 * implementation with two callers. A page and its endpoint cannot drift,
 * because there is nothing for them to drift apart *from*.
 *
 * `src/app` may import this. `presentation` may not, and does not need to.
 *
 * Wrapped in React's `cache` (F10.1): the shell's top bar needs the streak and
 * the dashboard page needs everything, and both are rendered inside one
 * request. Without this the layout and the page would each run the use case
 * and each hit the database for the same rows. `cache` is per-request — it is
 * request memoisation, not a cache with a lifetime, so no learner ever sees
 * another learner's numbers.
 */
export const readLearnerDashboard = cache(
  async (userId: string): Promise<ILearnerDashboard> =>
    makeGetLearnerDashboard(createContainer(crypto.randomUUID())).execute({ userId }),
);

export async function readProgressSummary(userId: string): Promise<IProgressSummary> {
  return makeGetProgressSummary(createContainer(crypto.randomUUID())).execute({ userId });
}
