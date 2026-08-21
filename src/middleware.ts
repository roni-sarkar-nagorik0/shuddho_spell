import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/session-client';

/**
 * Public by name. Everything the matcher reaches and this list does not is
 * protected — `04-authentication.md` step 4, and the direction matters: a page
 * added tomorrow is private until someone writes it down here, rather than
 * public until someone remembers to protect it.
 */
const PUBLIC_PAGES: readonly string[] = ['/', '/login', '/pricing', '/faq'];

/** `/auth/signin`, `/auth/callback` and anything else the sign-in flow needs. */
const PUBLIC_PREFIXES: readonly string[] = ['/auth/'];

export function isPublicPage(pathname: string): boolean {
  return (
    PUBLIC_PAGES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

/**
 * Runs before every page. Two jobs, in this order.
 *
 * First it refreshes the session. `getUser()` rather than `getSession()`: the
 * second one only decodes whatever cookie arrived, while the first verifies it
 * with the auth server and mints a new access token when the old one has
 * expired. Those new cookies are written onto `response` on the way past, which
 * is why the response has to be created before the client and returned after —
 * a fresh `NextResponse.next()` at the end would drop the refreshed session and
 * sign the learner out every hour.
 *
 * Then it protects the route. An unauthenticated request for a private page is
 * a redirect to `/login`, never a 401: a browser asking for a page should be
 * handed a page.
 *
 * API routes are deliberately outside the matcher. Their 401 is `withApi`'s,
 * and answering `fetch('/api/v1/me')` with a redirect to an HTML login page
 * gives the caller a 200 full of markup instead of an error it can branch on.
 * `/api/certificates/<code>/verify` is public for the same structural reason,
 * and
 * `/api/cron` authenticates with a bearer secret rather than a session.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);

  const { data } = await supabase.auth.getUser();

  if (data.user !== null || isPublicPage(request.nextUrl.pathname)) {
    return response;
  }

  const redirect = NextResponse.redirect(new URL('/login', request.url));

  // Carry over whatever the refresh attempt wrote. A failed refresh clears the
  // session cookies, and dropping that clear leaves the browser re-sending a
  // dead token on every request from here on.
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}

/**
 * Edge, not Node. `next build` warns that `@supabase/supabase-js` reads
 * `process.version`, which the Edge Runtime does not provide — the check falls
 * through to the global-fetch path, which is the right one there anyway. The
 * only way to silence it is `experimental.nodeMiddleware`, and an experimental
 * flag is a worse thing to depend on than a warning that is understood. D24.
 */
export const config = {
  matcher: [
    // Every path except Next's own internals, static assets and /api.
    //
    // `manifest.webmanifest` and `sw.js` are named the same way `favicon.ico`
    // already is, and for a sharper reason than tidiness: neither ends in an
    // extension the list below covers, so both were being treated as pages and
    // redirected to `/login` for anyone without a session. A browser fetching
    // a service worker and receiving an HTML login page does not follow the
    // redirect — it refuses the registration outright, because the response is
    // not JavaScript. The manifest fails the same way, quietly, and an install
    // prompt that never appears is not an error anybody sees.
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
