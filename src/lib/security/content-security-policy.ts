/**
 * The one place the policy is written, shared by `next.config.ts` and `proxy.ts`.
 *
 * It has to be shared, and the reason is the bug this file exists because of.
 * A `Content-Security-Policy` set in two places is not merged by the browser —
 * every policy present is enforced, and a script must satisfy **all** of them.
 * So a nonce granted by one header while another still says a bare
 * `script-src 'self'` grants nothing at all.
 *
 * Dependency-free on purpose: `next.config.ts` loads it in Node at build time
 * and `proxy.ts` loads it in the Edge runtime on every request.
 */

const GOOGLE_ACCOUNTS = 'https://accounts.google.com';

export interface ICspOptions {
  readonly supabaseUrl: string;
  /**
   * Present in production, absent in development.
   *
   * Absent is not laziness either: per the CSP spec a `nonce-` source makes the
   * browser **ignore** `'unsafe-inline'` in the same directive, and React
   * Refresh needs `'unsafe-inline'` and `'unsafe-eval'` to run. Minting a nonce
   * in development would therefore break the dev server to protect a page only
   * the developer can reach.
   */
  readonly nonce?: string | undefined;
  readonly isDevelopment: boolean;
}

/**
 * `script-src` is the directive that matters and the one that was wrong.
 *
 * Next streams the RSC payload a Server Component produces as an **inline**
 * `<script>` — `self.__next_f.push(...)` — and there is no version of the App
 * Router that does not. Production shipped `script-src 'self'` with no nonce,
 * which blocks that script, which means React never hydrates: every
 * `'use client'` component on the site was inert. The landing page rendered,
 * and nothing on it could be pressed.
 *
 * The fix is not `'unsafe-inline'`. A nonce keeps exactly the protection the
 * original comment was reaching for — an injected `<script>` still cannot run,
 * because an attacker cannot guess a value minted for that one response — while
 * letting Next's own scripts through. Next stamps the nonce onto every script
 * tag it emits once it sees one in the request's CSP header.
 *
 * `'unsafe-inline'` stays on `style-src`, for the reason it always did: Next
 * inlines critical CSS for a Server Component and there is no nonce plumbing
 * for it that survives streaming.
 */
export function contentSecurityPolicy(options: ICspOptions): string {
  const { supabaseUrl, nonce, isDevelopment } = options;

  const scriptSources = ["'self'"];

  if (nonce !== undefined) {
    scriptSources.push(`'nonce-${nonce}'`);
  }

  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'", "'unsafe-inline'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace('https://', 'wss://')}`.trim(),
    "media-src 'self' blob:",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Sign-in is a plain form POST to `/auth/signin`, which answers 303 to
    // Supabase's `/authorize`, which in turn bounces to Google's consent
    // screen. Chrome checks *every hop* of a form submission against
    // `form-action`, so `'self'` alone silently blocks the only door in.
    `form-action 'self' ${supabaseUrl} ${GOOGLE_ACCOUNTS}`.trim(),
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * One nonce per response. `crypto.randomUUID` is available in the Edge runtime
 * and is what the platform offers; base64 because that is the encoding the CSP
 * grammar expects.
 */
export function mintNonce(): string {
  return btoa(crypto.randomUUID());
}
