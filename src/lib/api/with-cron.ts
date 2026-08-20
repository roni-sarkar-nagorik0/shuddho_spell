import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { type NextRequest, type NextResponse } from 'next/server';
import { serverEnv } from '../env.server';
import { logger } from '../logger';
import { ApiError } from './problem';
import { withApi, type IHandlerContext } from './with-api';

// A cron route has no body, no query and no path segments — it is called by
// a scheduler at a fixed url, and the bearer check is its whole input.
type CronHandler = (ctx: IHandlerContext<undefined, undefined, undefined>) => Promise<unknown>;

/**
 * Constant time, and length-independent.
 *
 * `timingSafeEqual` throws when the two buffers differ in length, and throwing
 * early is itself a signal: a caller could learn the secret's length one guess
 * at a time. Hashing both sides first makes every comparison 32 bytes wide, so
 * the only thing the timing can reveal is that a comparison happened.
 */
function constantTimeEquals(provided: string, expected: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(provided).digest(),
    createHash('sha256').update(expected).digest(),
  );
}

/**
 * The guard every `/api/cron` handler is built by.
 *
 * A cron route has no user — there is nobody to sign in as — so it opts out of
 * the session check and authenticates with a shared secret instead. It is still
 * a `withApi` route underneath, which is where its request id, its log line and
 * its problem+json come from.
 *
 * Three things this deliberately does not do:
 *
 * - It never reads the secret from the query string. `04-authentication.md` is
 *   blunt about why: query strings end up in access logs, and a secret in an
 *   access log is a secret that has been published. The header is the only
 *   place it is looked for, so a caller that puts it in the url is simply
 *   unauthenticated.
 * - It never logs the secret, or the header, or how close a wrong one came.
 * - It refuses when `CRON_SECRET` is unset rather than waving the request
 *   through. The variable is optional in the env schema because the app runs
 *   fine without any cron jobs; a cron route that finds it missing is
 *   misconfigured, and open-by-default would be the worst possible reading.
 */
export function withCron(handler: CronHandler): (request: NextRequest) => Promise<NextResponse> {
  return withApi(async (ctx) => {
    const expected = serverEnv.CRON_SECRET;

    if (expected === undefined) {
      logger.error('a cron route was called but CRON_SECRET is not set');
      throw ApiError.cronUnauthorised();
    }

    const provided = ctx.request.headers.get('authorization');
    if (provided === null || !constantTimeEquals(provided, `Bearer ${expected}`)) {
      throw ApiError.cronUnauthorised();
    }

    return handler(ctx);
  }, { auth: 'public' });
}
