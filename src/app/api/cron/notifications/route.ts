/**
 * Two verbs, one handler.
 *
 * POST is what this job is: a scheduled sweep that writes. GET is what **Vercel
 * Cron sends**, and a scheduler that cannot reach its own job is a job that does
 * not run. The exception is worth naming rather than hiding: neither verb is
 * reachable without `Authorization: Bearer $CRON_SECRET`, which `withCron`
 * compares in constant time before anything else happens, so there is no link a
 * browser can follow in here and no prefetch that can set it off.
 *
 * Each line is its own re-export on purpose — `public-routes.test.ts` walks a
 * route to the handler behind it one statement at a time, and a combined block
 * would make this route look like it had no handler at all.
 */
export { notificationsCronHandler as POST } from '@/composition/handlers';
export { notificationsCronHandler as GET } from '@/composition/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One tick reads the whole roster and may dispatch three kinds of notification
 * for each learner, so it is a batch job rather than a request. The platform's
 * default ceiling cuts it off long before that finishes.
 */
export const maxDuration = 60;
