import { type CookieOptions } from '@supabase/ssr';

/**
 * Hardens the cookie attributes `@supabase/ssr` hands back before they reach the
 * cookie store.
 *
 * The library defaults `httpOnly` to `false` so that its own browser client can
 * read the session out of `document.cookie`. ShuddhoSpell never takes that path —
 * identity comes from the server-verified session — and the cookie carries the
 * access and refresh tokens, so script access is closed here. `httpOnly` is
 * written last on purpose: a caller cannot reopen it by passing `false`.
 */
export function toSessionCookieOptions(options: CookieOptions): CookieOptions {
  return { ...options, httpOnly: true };
}
