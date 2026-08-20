import { type NextRequest, type NextResponse } from 'next/server';
import { withCron } from '@/lib/api/with-cron';
import { type RunHourlyNotificationsUseCase } from '../../application/use-cases/run-hourly-notifications';

/**
 * `POST /api/cron/notifications` — the hourly tick.
 *
 * `withCron` authenticates with `Bearer ${CRON_SECRET}` compared in constant
 * time, header only — never the query string, because query strings end up in
 * access logs and a secret in an access log has been published — and refuses
 * outright when the variable is unset rather than waving the request through.
 *
 * Called **every hour**, not once a day. That is not a cost decision: the job
 * selects learners by their *local* hour, so there is no single server hour at
 * which it could run and still reach a UTC+6 learner at 20:00 their time.
 *
 * Safe to retry. Every notification in a tick shares one `scheduled_for` — the
 * top of the hour — so a platform re-invoking a job that already sent half its
 * batch collides with the half it sent and delivers the half it did not.
 */
export function createNotificationsCronHandler(
  useCase: () => RunHourlyNotificationsUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withCron(async () => useCase().execute());
}
