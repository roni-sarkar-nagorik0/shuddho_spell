import { type CookieOptions } from '@supabase/ssr';
import { publicEnv } from '../env.public';

/**
 * `https` is read from the app's own canonical origin, not from the request.
 *
 * Behind a proxy the request's protocol arrives as `x-forwarded-proto`, which
 * is a header the client can send. Trusting it means an attacker can ask for a
 * session cookie without `secure` and then read it off a downgraded connection.
 * `NEXT_PUBLIC_APP_URL` is configuration: it says what this deployment *is*,
 * and it is the same answer on every code path, so the middleware and the
 * `next/headers` store cannot disagree about one cookie.
 */
const isHttps = publicEnv.NEXT_PUBLIC_APP_URL.startsWith('https:');

/**
 * Hardens the cookie attributes `@supabase/ssr` hands back before they reach the
 * cookie store.
 *
 * The library defaults `httpOnly` to `false` so that its own browser client can
 * read the session out of `document.cookie`. ShuddhoSpell never takes that path —
 * identity comes from the server-verified session — and the cookie carries the
 * access and refresh tokens, so script access is closed here. `httpOnly` and
 * `secure` are written last on purpose: a caller cannot reopen either by
 * passing `false`.
 *
 * `secure` was left out by F3.1 because it would break plain-http local
 * development. Deriving it from the app url keeps that true — `http://localhost`
 * yields `false` — without leaving a deployed cookie unprotected (F3.4).
 */
export function toSessionCookieOptions(options: CookieOptions): CookieOptions {
  return { ...options, httpOnly: true, secure: isHttps };
}
