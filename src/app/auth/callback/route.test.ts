// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface ISessionUser {
  readonly id: string;
  readonly email?: string;
  readonly user_metadata?: Record<string, unknown>;
}

interface IExchangeResult {
  readonly data: { readonly session: { readonly user: ISessionUser } | null };
  readonly error: { readonly message: string } | null;
}

interface IBootstrapCall {
  readonly userId: string;
  readonly fullName: string | undefined;
  readonly email: string | undefined;
}

interface IHarness {
  exchangedCode: string | null;
  exchange: IExchangeResult;
  bootstrapped: IBootstrapCall | null;
  onboardedAt: Date | null;
  bootstrapFails: boolean;
  readonly logged: unknown[];
}

const SESSION: IExchangeResult = {
  data: {
    session: {
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        user_metadata: { full_name: 'Ayesha Rahman' },
      },
    },
  },
  error: null,
};

const harness = vi.hoisted<IHarness>(() => ({
  exchangedCode: null,
  exchange: { data: { session: null }, error: null },
  bootstrapped: null,
  onboardedAt: null,
  bootstrapFails: false,
  logged: [],
}));

vi.mock('@/lib/env.public', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'https://shuddhospell.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'the-anon-key',
  },
}));

vi.mock('@/lib/logger', () => {
  const record = (payload: unknown): void => {
    harness.logged.push(payload);
  };
  return { logger: { error: record, warn: record } };
});

vi.mock('@/lib/supabase/session-client', () => ({
  createSessionClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: (code: string): Promise<IExchangeResult> => {
          harness.exchangedCode = code;
          return Promise.resolve(harness.exchange);
        },
      },
    }),
}));

vi.mock('@/composition/container', () => ({
  createContainer: (requestId: string) => ({ requestId }),
}));

vi.mock('@/composition/use-cases', () => ({
  makeBootstrapProfile: () => ({
    execute: (input: IBootstrapCall) => {
      harness.bootstrapped = input;
      if (harness.bootstrapFails) {
        return Promise.reject(new Error('the database is unreachable'));
      }
      return Promise.resolve({
        id: 'profile-1',
        userId: input.userId,
        displayName: input.fullName ?? 'Learner',
        onboardingCompletedAt: harness.onboardedAt,
        hasOnboarded: () => harness.onboardedAt !== null,
      });
    },
  }),
}));

const { GET } = await import('./route');

function callback(query: string): NextRequest {
  return new NextRequest(`https://shuddhospell.test/auth/callback${query}`);
}

async function destinationOf(query: string): Promise<string> {
  const response = await GET(callback(query));
  return response.headers.get('location') ?? '';
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    harness.exchangedCode = null;
    harness.exchange = SESSION;
    harness.bootstrapped = null;
    harness.onboardedAt = null;
    harness.bootstrapFails = false;
    harness.logged.length = 0;
  });

  it('exchanges the code Google sent, and nothing it invented itself', async () => {
    await GET(callback('?code=the-code'));

    expect(harness.exchangedCode).toBe('the-code');
  });

  it('sends a brand-new profile to onboarding', async () => {
    harness.onboardedAt = null;

    expect(await destinationOf('?code=the-code')).toBe('https://shuddhospell.test/onboarding');
  });

  it('sends a learner who has already onboarded to the dashboard', async () => {
    harness.onboardedAt = new Date('2026-08-01T10:00:00Z');

    expect(await destinationOf('?code=the-code')).toBe('https://shuddhospell.test/dashboard');
  });

  it('reconciles the profile on the first authenticated request', async () => {
    await GET(callback('?code=the-code'));

    expect(harness.bootstrapped).toStrictEqual({
      userId: 'user-1',
      fullName: 'Ayesha Rahman',
      email: 'learner@example.com',
    });
  });

  it('takes the identity from the session, never from the url', async () => {
    await GET(callback('?code=the-code&userId=somebody-else'));

    expect(harness.bootstrapped?.userId).toBe('user-1');
  });

  it('passes on Google\'s other spelling of the name', async () => {
    harness.exchange = {
      data: { session: { user: { id: 'user-1', user_metadata: { name: 'Rahim' } } } },
      error: null,
    };

    await GET(callback('?code=the-code'));

    expect(harness.bootstrapped?.fullName).toBe('Rahim');
  });

  it('asks for no name at all when the session carries none', async () => {
    harness.exchange = { data: { session: { user: { id: 'user-1' } } }, error: null };

    await GET(callback('?code=the-code'));

    expect(harness.bootstrapped?.fullName).toBeUndefined();
  });

  it('keeps a signed-in learner signed in when the reconciler fails, and logs it', async () => {
    harness.bootstrapFails = true;

    expect(await destinationOf('?code=the-code')).toBe('https://shuddhospell.test/onboarding');
    expect(harness.logged).toHaveLength(1);
  });

  it('bounces back to the login page, without exchanging, when Google refused', async () => {
    expect(await destinationOf('?error=access_denied')).toBe(
      'https://shuddhospell.test/login?error=google',
    );
    expect(harness.exchangedCode).toBeNull();
  });

  it('refuses to exchange even when a refusal arrives carrying a code', async () => {
    expect(await destinationOf('?error=access_denied&code=the-code')).toBe(
      'https://shuddhospell.test/login?error=google',
    );
    expect(harness.exchangedCode).toBeNull();
  });

  it('bounces back to the login page, without exchanging, when there is no code at all', async () => {
    expect(await destinationOf('')).toBe('https://shuddhospell.test/login?error=google');
    expect(harness.exchangedCode).toBeNull();
  });

  it('bounces back to the login page and logs it when the exchange fails', async () => {
    harness.exchange = { data: { session: null }, error: { message: 'invalid code verifier' } };

    const response = await GET(callback('?code=stale'));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://shuddhospell.test/login?error=google');
    expect(harness.logged).toHaveLength(1);
  });
});
