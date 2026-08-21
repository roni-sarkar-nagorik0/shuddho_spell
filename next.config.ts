import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content-Security-Policy, and the four headers around it (F13.6).
 *
 * `'unsafe-inline'` on `style-src` is not laziness: Next injects the critical
 * CSS for a Server Component as an inline `<style>`, and there is no nonce
 * plumbing for it that survives streaming. Scripts are the half that matters
 * and they are **not** given `unsafe-inline` outside development, where React
 * Refresh needs `unsafe-eval` and will not run without it.
 *
 * `connect-src` lists Supabase because that is the only host the browser talks
 * to. `font-src` and `img-src` are `'self'` and `data:` only — the design
 * system forbids illustration, and the four fonts are self-hosted by
 * `next/font`, so there is no CDN to allow.
 *
 * `frame-ancestors 'none'` is the clickjacking control that matters; the
 * `X-Frame-Options` beside it is for the browsers that still only read that.
 */
const GOOGLE_ACCOUNTS = 'https://accounts.google.com';

function contentSecurityPolicy(): string {
  const supabase = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
  const isDevelopment = process.env['NODE_ENV'] !== 'production';

  return [
    "default-src 'self'",
    `script-src 'self'${isDevelopment ? " 'unsafe-eval' 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabase} ${supabase.replace('https://', 'wss://')}`.trim(),
    "media-src 'self' blob:",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Sign-in is a plain form POST to `/auth/signin`, which answers 303 to
    // Supabase's `/authorize`, which in turn bounces to Google's consent
    // screen. Chrome checks *every hop* of a form submission against
    // `form-action`, so `'self'` alone silently blocks the only door in.
    `form-action 'self' ${supabase} ${GOOGLE_ACCOUNTS}`.trim(),
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
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
    Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }]),
};

export default withNextIntl(nextConfig);
