import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type CookieOptions } from '@supabase/ssr';

/**
 * F3.1 — proves the wiring, not just the rule. `toSessionCookieOptions` being
 * correct is worth nothing if the client stops calling it, so this drives the
 * real `createSessionClient`, captures the `setAll` callback `@supabase/ssr`
 * would own, and inspects what reaches the cookie store.
 */

interface ICookieToSet {
  readonly name: string;
  readonly value: string;
  readonly options: CookieOptions;
}

interface IServerClientCall {
  readonly url: string;
  readonly key: string;
}

interface IHarness {
  /** Everything written to the cookie store, in order. */
  readonly written: ICookieToSet[];
  /** The callback Supabase would invoke to persist a refreshed session. */
  setAll: ((cookies: readonly ICookieToSet[]) => void) | null;
  /** What `createServerClient` was constructed with. */
  clientCall: IServerClientCall | null;
}

const harness = vi.hoisted<IHarness>(() => ({ written: [], setAll: null, clientCall: null }));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      getAll: () => [],
      set: (name: string, value: string, options: CookieOptions) => {
        harness.written.push({ name, value, options });
      },
    }),
}));

vi.mock('../env.public', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'https://shuddhospell.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'the-anon-key',
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    url: string,
    key: string,
    options: { readonly cookies: { setAll?: (cookies: readonly ICookieToSet[]) => void } },
  ) => {
    harness.clientCall = { url, key };
    harness.setAll = options.cookies.setAll ?? null;
    return { auth: {} };
  },
}));

const { createSessionClient } = await import('./session-client');

/** Runs the client's own persistence path and returns what the cookie store received. */
async function persist(cookies: readonly ICookieToSet[]): Promise<readonly ICookieToSet[]> {
  await createSessionClient();

  if (harness.setAll === null) {
    throw new Error('the session client registered no setAll callback — the cookie wiring is gone');
  }
  harness.setAll(cookies);

  return harness.written;
}

/** What `@supabase/ssr` actually hands over: httpOnly false, by its own default. */
const SUPABASE_DEFAULTS: CookieOptions = {
  path: '/',
  sameSite: 'lax',
  httpOnly: false,
  maxAge: 400 * 24 * 60 * 60,
};

beforeEach(() => {
  harness.written.length = 0;
  harness.setAll = null;
  harness.clientCall = null;
});

describe('createSessionClient', () => {
  it('writes the session cookie httpOnly', async () => {
    const written = await persist([
      { name: 'sb-project-auth-token', value: 'access.and.refresh', options: SUPABASE_DEFAULTS },
    ]);

    expect(written).toHaveLength(1);
    expect(written[0]?.options.httpOnly, 'a script could read the session tokens').toBe(true);
  });

  it('hardens every cookie in the batch, not just the first', async () => {
    // Supabase splits a session too large for one cookie into .0, .1, … chunks.
    // A loop that hardened only the first would leak the rest of the token.
    const written = await persist([
      { name: 'sb-project-auth-token.0', value: 'first-half', options: SUPABASE_DEFAULTS },
      { name: 'sb-project-auth-token.1', value: 'second-half', options: SUPABASE_DEFAULTS },
    ]);

    expect(written.map((cookie) => cookie.name)).toStrictEqual([
      'sb-project-auth-token.0',
      'sb-project-auth-token.1',
    ]);
    for (const cookie of written) {
      expect(cookie.options.httpOnly, `${cookie.name} reached the browser readable`).toBe(true);
    }
  });

  it('keeps the name and value Supabase asked for', async () => {
    const written = await persist([
      { name: 'sb-project-auth-token', value: 'access.and.refresh', options: SUPABASE_DEFAULTS },
    ]);

    expect(written[0]?.name).toBe('sb-project-auth-token');
    expect(written[0]?.value).toBe('access.and.refresh');
  });

  it('leaves the rest of Supabase’s cookie attributes untouched', async () => {
    const written = await persist([
      { name: 'sb-project-auth-token', value: 'access.and.refresh', options: SUPABASE_DEFAULTS },
    ]);

    expect(written[0]?.options).toStrictEqual({ ...SUPABASE_DEFAULTS, httpOnly: true });
  });

  it('builds on the anon key, so RLS still applies to the learner', async () => {
    await createSessionClient();

    expect(harness.clientCall).toStrictEqual({
      url: 'https://project.supabase.co',
      key: 'the-anon-key',
    });
  });
});
