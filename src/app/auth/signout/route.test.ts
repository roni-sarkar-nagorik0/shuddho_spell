// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface ISignOutCall {
  readonly scope: string | undefined;
}

interface ICookie {
  readonly name: string;
  readonly value: string;
}

interface IHarness {
  call: ISignOutCall | null;
  error: { readonly message: string } | null;
  cookies: ICookie[];
  readonly deleted: string[];
  readonly logged: unknown[];
}

const harness = vi.hoisted<IHarness>(() => ({
  call: null,
  error: null,
  cookies: [],
  deleted: [],
  logged: [],
}));

vi.mock('@/lib/env.public', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'https://shuddhospell.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'the-anon-key',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: (payload: unknown) => {
      harness.logged.push(payload);
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      getAll: () => harness.cookies,
      delete: (name: string) => {
        harness.deleted.push(name);
      },
    }),
}));

vi.mock('@/lib/supabase/session-client', () => ({
  createSessionClient: () =>
    Promise.resolve({
      auth: {
        signOut: (options?: { scope?: string }) => {
          harness.call = { scope: options?.scope };
          return Promise.resolve({ error: harness.error });
        },
      },
    }),
}));

const { POST } = await import('./route');

describe('POST /auth/signout', () => {
  beforeEach(() => {
    harness.call = null;
    harness.error = null;
    harness.cookies = [];
    harness.deleted.length = 0;
    harness.logged.length = 0;
  });

  it('revokes this browser session and not the learner’s other devices', async () => {
    await POST();

    expect(harness.call?.scope).toBe('local');
  });

  it('lands on /login with a 303, so a refresh cannot re-post', async () => {
    const response = await POST();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://shuddhospell.test/login');
  });

  it('leaves the cookies to the library when the revocation succeeded', async () => {
    harness.cookies = [{ name: 'sb-project-auth-token', value: 'the-session' }];

    await POST();

    expect(harness.deleted).toStrictEqual([]);
    expect(harness.logged).toStrictEqual([]);
  });

  it('clears the session cookies itself when the revocation failed', async () => {
    harness.error = { message: 'the auth server is unreachable' };
    harness.cookies = [
      { name: 'sb-project-auth-token', value: 'the-session' },
      { name: 'sb-project-auth-token.1', value: 'the-rest-of-it' },
      { name: 'sidebar-collapsed', value: 'true' },
    ];

    const response = await POST();

    // The chunked session cookie, both halves. Not the sidebar preference —
    // signing out is not a reason to forget how the learner likes the rail.
    expect(harness.deleted).toStrictEqual(['sb-project-auth-token', 'sb-project-auth-token.1']);
    expect(harness.logged).toHaveLength(1);
    expect(response.status).toBe(303);
  });
});
