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
    "form-action 'self'",
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: { typedEnv: true },
  headers: () =>
    Promise.resolve([{ source: '/:path*', headers: SECURITY_HEADERS }]),
};

export default withNextIntl(nextConfig);
