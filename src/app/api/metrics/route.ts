import { withCron } from '@/lib/api/with-cron';
import { readMetrics } from '@/composition/reads';

/**
 * `GET /api/metrics` (F13.8).
 *
 * **Behind `withCron`, not `auth: 'public'`.** These are aggregate counts over
 * every learner, and an unauthenticated endpoint publishing how many people use
 * the product and how many exams are live is a business-intelligence feed for
 * whoever finds the url. The `CRON_SECRET` bearer is already the right shape —
 * a machine credential compared in constant time with no user behind it, which
 * is exactly what a scraper is. It therefore does not belong in
 * `public-routes.test.ts`'s allowlist, and is not in it.
 *
 * **It answers JSON, not Prometheus text**, which is a real limitation rather
 * than a preference: `withCron` wraps `withApi`, which owns the
 * `{ data, meta }` envelope for every route in the product, and bypassing it to
 * emit `text/plain` would mean a second copy of the constant-time bearer check
 * — the last thing worth duplicating. `renderMetrics` turns the same snapshot
 * into the exposition format, so a scraper needs a four-line adapter. Recorded
 * rather than pretended away.
 */
export const GET = withCron(async () => readMetrics());

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
