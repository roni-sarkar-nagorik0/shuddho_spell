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
