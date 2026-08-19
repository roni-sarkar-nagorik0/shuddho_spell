// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface IOAuthCall {
  readonly provider: string;
  readonly redirectTo: string | undefined;
}

interface IOAuthResult {
  readonly data: { readonly url: string | null };
  readonly error: { readonly message: string } | null;
}

interface IHarness {
  call: IOAuthCall | null;
  result: IOAuthResult;
  readonly logged: unknown[];
}

const harness = vi.hoisted<IHarness>(() => ({
  call: null,
  result: {
    data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
    error: null,
  },
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
    error: (payload: unknown) => {
      harness.logged.push(payload);
    },
  },
}));

vi.mock('@/lib/supabase/session-client', () => ({
  createSessionClient: () =>
    Promise.resolve({
      auth: {
        signInWithOAuth: (options: {
          provider: string;
          options?: { redirectTo?: string };
        }): Promise<IOAuthResult> => {
          harness.call = { provider: options.provider, redirectTo: options.options?.redirectTo };
          return Promise.resolve(harness.result);
        },
      },
    }),
}));

const { POST } = await import('./route');

describe('POST /auth/signin', () => {
  beforeEach(() => {
    harness.call = null;
    harness.logged.length = 0;
    harness.result = {
      data: { url: 'https://project.supabase.co/auth/v1/authorize?provider=google' },
      error: null,
    };
  });

  it('asks Supabase for Google and nothing else', async () => {
    await POST();

    expect(harness.call?.provider).toBe('google');
  });

  it('sends the learner back to our own callback, not wherever the request came from', async () => {
    await POST();

    expect(harness.call?.redirectTo).toBe('https://shuddhospell.test/auth/callback');
  });

  it('redirects to the url Supabase built, with a 303 so a refresh cannot re-post', async () => {
    const response = await POST();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'https://project.supabase.co/auth/v1/authorize?provider=google',
    );
  });

  it('bounces back to /login and logs it when the url cannot be built', async () => {
    harness.result = { data: { url: null }, error: { message: 'provider disabled' } };

    const response = await POST();

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://shuddhospell.test/login?error=google');
    expect(harness.logged).toHaveLength(1);
  });
});
