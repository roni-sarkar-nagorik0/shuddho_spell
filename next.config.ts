import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { contentSecurityPolicy } from './src/lib/security/content-security-policy';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * The five static security headers. **`Content-Security-Policy` is not among
 * them any more**, and that is the point of this comment.
 *
 * CSP now carries a per-request nonce, which a build-time header cannot have,
 * so it is set in `proxy.ts` — see `src/lib/security/content-security-policy.ts`
 * for what went wrong without one. Setting it here as well would not add a
 * second opinion; it would *override* the nonce, because a browser enforces
 * every CSP header present and a script has to satisfy all of them.
 *
 * `/api/*` is outside the proxy's matcher and so gets its own, nonce-less CSP
 * below: those responses are JSON and execute nothing, but a policy on them
 * still costs nothing and closes the gap.
 *
 * `frame-ancestors 'none'` moves with the CSP; the `X-Frame-Options` here is
 * for the browsers that still only read that.
 */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No feature this product uses needs any of these, and a certificate
  // verification page has no business asking for a camera.
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=(), usb=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/**
 * Refuse to build a production deployment that points its own front door at a
 * laptop.
 *
 * `NEXT_PUBLIC_APP_URL` is not decoration. `auth/signin` builds the OAuth
 * `redirect_to` out of it, so a deployment carrying `http://localhost:3000`
 * asks Supabase to send every learner who signs in back to their own machine —
 * where nothing is listening. It also decides the `secure` flag on the session
 * cookie (`session-cookie-options.ts`), so the same mistake ships cookies that
 * are not marked secure over HTTPS.
 *
 * It failed silently once, in production, and cost an afternoon: sign-in worked
 * locally, the deploy went green, and the only symptom was a browser landing on
 * `localhost:3000/auth/callback?code=…` with nothing there.
 *
 * **Gated on `VERCEL_ENV === 'production'`, deliberately.** `NODE_ENV` is
 * `production` during any `next build`, including one run on a laptop against
 * `.env`, and refusing those would make it impossible to test a production
 * build locally. Preview deployments get a different url per deployment and are
 * left alone.
 */
function assertProductionUrl(): void {
  if (process.env['VERCEL_ENV'] !== 'production') {
    return;
  }

  const url = process.env['NEXT_PUBLIC_APP_URL'] ?? '';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/u.test(url);

  if (url === '' || isLocal || !url.startsWith('https://')) {
    throw new Error(
      [
        `NEXT_PUBLIC_APP_URL is ${url === '' ? 'not set' : `"${url}"`}, which cannot be right for a production deployment.`,
        '',
        'Set it to this deployment\'s own origin — Vercel → Settings → Environment',
        'Variables, scope Production — and redeploy. A NEXT_PUBLIC_* variable is',
        'inlined at build time, so changing it without a new build changes nothing.',
        '',
        'The same origin has to be in Supabase → Authentication → URL Configuration,',
        'both as the Site URL and in the Redirect URLs allow-list as <origin>/auth/callback.',
      ].join('\n'),
    );
  }
}

assertProductionUrl();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: { typedEnv: true },
  headers: () =>
    Promise.resolve([
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        // The proxy does not run on `/api`, so nothing else would give these a
        // policy. No nonce: a JSON body has no scripts to grant one to.
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy({
              supabaseUrl: process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
              isDevelopment: process.env['NODE_ENV'] !== 'production',
            }),
          },
        ],
      },
    ]),
};

export default withNextIntl(nextConfig);
