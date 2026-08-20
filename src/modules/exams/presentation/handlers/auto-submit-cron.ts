import { type NextRequest, type NextResponse } from 'next/server';
import { withCron } from '@/lib/api/with-cron';
import { type AutoSubmitAbandonedExamsUseCase } from '../../application/use-cases/auto-submit-abandoned-exams';

/**
 * `POST /api/cron/exam-autosubmit` — the backstop, not the primary path.
 *
 * `withCron` authenticates with `Bearer ${CRON_SECRET}`, compared in constant
 * time, header only, and refuses outright when the variable is unset. There is
 * no user here and no session to check: a scheduler is not a learner.
 *
 * Safe to call twice. The database function 016 returns early on an attempt
 * that is no longer awaiting marking, so a platform retry, an overlapping tick
 * or a double-fire finishes each attempt exactly once — which is rule 9's
 * actual requirement, not merely a nicety.
 */
export function createAutoSubmitCronHandler(
  useCase: () => AutoSubmitAbandonedExamsUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withCron(async () => useCase().execute());
}
