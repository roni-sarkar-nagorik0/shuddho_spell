// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface IExchangeResult {
  readonly data: { readonly session: { readonly user: { readonly id: string } } | null };
  readonly error: { readonly message: string } | null;
}

interface IProfileResult {
  readonly data: { readonly onboarding_completed_at: string | null } | null;
  readonly error: { readonly message: string } | null;
}

interface IQuery {
  readonly table: string;
  readonly columns: string;
  readonly column: string;
  readonly value: unknown;
}

interface IHarness {
  exchangedCode: string | null;
  exchange: IExchangeResult;
  query: IQuery | null;
  profile: IProfileResult;
  readonly logged: unknown[];
}

const SESSION: IExchangeResult = {
  data: { session: { user: { id: 'user-1' } } },
  error: null,
};

const harness = vi.hoisted<IHarness>(() => ({
  exchangedCode: null,
  exchange: { data: { session: { user: { id: 'user-1' } } }, error: null },
  query: null,
  profile: { data: { onboarding_completed_at: null }, error: null },
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
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: unknown) => ({
            maybeSingle: (): Promise<IProfileResult> => {
              harness.query = { table, columns, column, value };
              return Promise.resolve(harness.profile);
            },
          }),
        }),
      }),
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
    harness.query = null;
    harness.profile = { data: { onboarding_completed_at: null }, error: null };
    harness.logged.length = 0;
  });

  it('exchanges the code Google sent, and nothing it invented itself', async () => {
    await GET(callback('?code=the-code'));

    expect(harness.exchangedCode).toBe('the-code');
  });

  it('sends a brand-new profile to onboarding', async () => {
    harness.profile = { data: { onboarding_completed_at: null }, error: null };

    expect(await destinationOf('?code=the-code')).toBe('https://shuddhospell.test/onboarding');
  });

  it('sends a learner who has already onboarded to the dashboard', async () => {
    harness.profile = { data: { onboarding_completed_at: '2026-08-01T10:00:00Z' }, error: null };

    expect(await destinationOf('?code=the-code')).toBe('https://shuddhospell.test/dashboard');
  });

  it('asks only for the one column it routes on, for this session and no other', async () => {
    await GET(callback('?code=the-code'));

    expect(harness.query).toEqual({
      table: 'learner_profiles',
      columns: 'onboarding_completed_at',
      column: 'user_id',
      value: 'user-1',
    });
  });

  it('treats a missing profile row as brand new rather than as a failure', async () => {
    harness.profile = { data: null, error: null };

    expect(await destinationOf('?code=the-code')).toBe('https://shuddhospell.test/onboarding');
  });

  it('keeps a signed-in learner signed in when the profile read fails, and logs it', async () => {
    harness.profile = { data: null, error: { message: 'permission denied' } };

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
