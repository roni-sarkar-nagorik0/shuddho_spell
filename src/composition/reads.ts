import 'server-only';
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
 */
export async function readLearnerDashboard(userId: string): Promise<ILearnerDashboard> {
  return makeGetLearnerDashboard(createContainer(crypto.randomUUID())).execute({ userId });
}

export async function readProgressSummary(userId: string): Promise<IProgressSummary> {
  return makeGetProgressSummary(createContainer(crypto.randomUUID())).execute({ userId });
}
