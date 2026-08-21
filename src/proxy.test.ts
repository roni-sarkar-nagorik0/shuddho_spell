// @vitest-environment node
import { NextRequest, type NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface IHarness {
  /** The signed-in user, or null for an anonymous request. */
  user: { readonly id: string } | null;
  /** Cookies the refresh wrote onto the outgoing response. */
  refreshed: readonly { readonly name: string; readonly value: string }[];
  requests: number;
}

const harness = vi.hoisted<IHarness>(() => ({ user: null, refreshed: [], requests: 0 }));

vi.mock('@/lib/supabase/session-client', () => ({
  createMiddlewareClient: (_request: NextRequest, response: NextResponse) => {
    harness.requests += 1;
    for (const cookie of harness.refreshed) {
      response.cookies.set(cookie.name, cookie.value);
    }
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: harness.user }, error: null }),
      },
    };
  },
}));

// Stubbed the way `auth/signin/route.test.ts` stubs it: the real module
// validates at import and would throw here, and the proxy only needs the
// Supabase origin to build `connect-src`. `isDevelopment: false` is the
// interesting branch — it is the one that mints a nonce.
vi.mock('@/lib/env.public', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'https://shuddhospell.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'the-anon-key',
  },
  isDevelopment: false,
}));

const { config, isPublicPage, proxy } = await import('./proxy');

function get(path: string): NextRequest {
  return new NextRequest(`https://shuddhospell.test${path}`);
}

/** The matcher is a string in `config`; this is what Next does with it. */
function matches(path: string): boolean {
  return config.matcher.some((pattern) => new RegExp(`^${pattern}$`, 'u').test(path));
}

describe('route protection', () => {
  beforeEach(() => {
    harness.user = null;
    harness.refreshed = [];
    harness.requests = 0;
  });

  it('sends an unauthenticated request for a protected page to /login', async () => {
    const response = await proxy(get('/dashboard'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://shuddhospell.test/login');
  });

  it('protects onboarding too — the callback sends new learners there', async () => {
    const response = await proxy(get('/onboarding'));

    expect(response.headers.get('location')).toBe('https://shuddhospell.test/login');
  });

  it('lets a signed-in learner through to the page they asked for', async () => {
    harness.user = { id: 'user-1' };

    const response = await proxy(get('/dashboard'));

    expect(response.headers.get('location')).toBeNull();
    expect(response.status).toBe(200);
  });

  it('leaves the public pages open to nobody in particular', async () => {
    for (const path of ['/', '/login', '/pricing', '/faq', '/auth/callback', '/auth/signin', '/auth/signout']) {
      const response = await proxy(get(path));

      expect(response.headers.get('location'), `${path} was not public`).toBeNull();
    }
  });

  it('is protect-by-default: a page nobody listed is private', () => {
    expect(isPublicPage('/lesson/3')).toBe(false);
    expect(isPublicPage('/exams/mid')).toBe(false);
    expect(isPublicPage('/certificate/abc')).toBe(false);
  });

  it('does not treat a path that merely starts with a public one as public', () => {
    expect(isPublicPage('/loginish')).toBe(false);
    expect(isPublicPage('/pricing/secret')).toBe(false);
  });
});

describe('session refresh', () => {
  beforeEach(() => {
    harness.user = null;
    harness.refreshed = [];
    harness.requests = 0;
  });

  it('refreshes on a public page too, so a valid session does not go stale on the landing page', async () => {
    await proxy(get('/'));

    expect(harness.requests).toBe(1);
  });

  it('keeps the refreshed cookies on the way through', async () => {
    harness.user = { id: 'user-1' };
    harness.refreshed = [{ name: 'sb-project-auth-token', value: 'a-newer-token' }];

    const response = await proxy(get('/dashboard'));

    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('a-newer-token');
  });

  it('carries the cleared cookies onto the redirect, so a dead token is not re-sent forever', async () => {
    harness.user = null;
    harness.refreshed = [{ name: 'sb-project-auth-token', value: '' }];

    const response = await proxy(get('/dashboard'));

    expect(response.headers.get('location')).toBe('https://shuddhospell.test/login');
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('');
  });
});

describe('the matcher', () => {
  it('keeps the api out — its 401 belongs to withApi, not to a redirect', () => {
    expect(matches('/api/v1/me')).toBe(false);
    expect(matches('/api/cron/notifications')).toBe(false);
    expect(matches('/api/certificates/abc/verify')).toBe(false);
    expect(matches('/api/health')).toBe(false);
  });

  it('runs on the pages', () => {
    expect(matches('/')).toBe(true);
    expect(matches('/dashboard')).toBe(true);
    expect(matches('/lesson/3')).toBe(true);
  });

  it('skips Next internals and static files, which carry no session decision', () => {
    expect(matches('/_next/static/chunk.js')).toBe(false);
    expect(matches('/favicon.ico')).toBe(false);
    expect(matches('/logo.svg')).toBe(false);
    expect(matches('/fonts/body.woff2')).toBe(false);
  });
});

/**
 * The half of the proxy that has nothing to do with sessions, and the half that
 * was broken in production for weeks without anything noticing.
 *
 * Next streams every Server Component's payload as an inline `<script>`. A
 * policy of `script-src 'self'` with no nonce blocks it, React never hydrates,
 * and the whole site renders correctly and does nothing. These assert the
 * mechanism rather than the symptom: a nonce in the policy, the same nonce on
 * the request (which is how Next learns to stamp it onto its own tags), and a
 * different one every time.
 */
describe('the content security policy', () => {
  function policyOf(response: NextResponse): string {
    return response.headers.get('content-security-policy') ?? '';
  }

  it('grants a nonce to scripts, and never unsafe-inline', async () => {
    const policy = policyOf(await proxy(get('/')));

    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/u);
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('puts the policy on the request too — without that, Next stamps no nonce', async () => {
    // `NextResponse.next({ request: { headers } })` replays the headers back
    // through `x-middleware-request-*`, which is what Next reads downstream.
    const response = await proxy(get('/'));
    const forwarded = response.headers.get('x-middleware-request-content-security-policy');

    expect(forwarded).toBe(policyOf(response));
  });

  it('mints a fresh nonce per response — a reused one is not a nonce', async () => {
    const [first, second] = await Promise.all([proxy(get('/')), proxy(get('/'))]);

    const nonceOf = (r: NextResponse): string =>
      /'nonce-([A-Za-z0-9+/=]+)'/u.exec(policyOf(r))?.[1] ?? '';

    expect(nonceOf(first)).not.toBe('');
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it('carries the policy onto the redirect an anonymous visitor gets', async () => {
    harness.user = null;

    expect(policyOf(await proxy(get('/dashboard')))).toContain("script-src 'self' 'nonce-");
  });

  it('still lets the sign-in form reach Supabase and Google', async () => {
    const policy = policyOf(await proxy(get('/login')));

    expect(policy).toContain('form-action');
    expect(policy).toContain('https://accounts.google.com');
    expect(policy).toContain('https://project.supabase.co');
  });
});
