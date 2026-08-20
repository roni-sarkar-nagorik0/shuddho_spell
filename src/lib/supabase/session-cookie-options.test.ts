import { describe, expect, it, vi } from 'vitest';
import { type CookieOptions } from '@supabase/ssr';

/**
 * F3.1 — the session cookie is httpOnly. F3.4 — and `secure` off an https app url.
 *
 * `@supabase/ssr` ships `httpOnly: false` in its own DEFAULT_COOKIE_OPTIONS, so
 * this is a correction, not a restatement. These cases pin the correction down;
 * `session-client.test.ts` proves the client actually applies it.
 */

vi.mock('../env.public', () => ({
  publicEnv: {
    NEXT_PUBLIC_APP_URL: 'https://shuddhospell.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'the-anon-key',
  },
}));

const { toSessionCookieOptions } = await import('./session-cookie-options');
describe('toSessionCookieOptions', () => {
  it('marks the cookie httpOnly when Supabase said nothing about it', () => {
    expect(toSessionCookieOptions({}).httpOnly).toBe(true);
  });

  it('marks the cookie httpOnly over an explicit false — the library default', () => {
    expect(toSessionCookieOptions({ httpOnly: false }).httpOnly).toBe(true);
  });

  it('leaves every other attribute Supabase chose alone', () => {
    const supabaseDefaults: CookieOptions = {
      path: '/',
      sameSite: 'lax',
      maxAge: 400 * 24 * 60 * 60,
      domain: 'shuddhospell.app',
    };

    expect(toSessionCookieOptions(supabaseDefaults)).toStrictEqual({
      ...supabaseDefaults,
      httpOnly: true,
      secure: true,
    });
  });

  it('marks the cookie secure when the app is served over https', () => {
    expect(toSessionCookieOptions({}).secure).toBe(true);
  });

  it('marks the cookie secure over an explicit false', () => {
    expect(toSessionCookieOptions({ secure: false }).secure).toBe(true);
  });

  it('leaves secure off on plain http, so local development still receives the cookie', async () => {
    vi.resetModules();
    vi.doMock('../env.public', () => ({
      publicEnv: {
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'the-anon-key',
      },
    }));

    const local = await import('./session-cookie-options');

    expect(local.toSessionCookieOptions({}).secure).toBe(false);
    expect(local.toSessionCookieOptions({}).httpOnly, 'httpOnly is not conditional').toBe(true);

    vi.doUnmock('../env.public');
    vi.resetModules();
  });

  it('does not mutate the options it was handed', () => {
    const original: CookieOptions = { httpOnly: false, path: '/' };
    toSessionCookieOptions(original);
    expect(original.httpOnly).toBe(false);
  });
});
