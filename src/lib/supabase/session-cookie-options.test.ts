import { describe, expect, it } from 'vitest';
import { type CookieOptions } from '@supabase/ssr';
import { toSessionCookieOptions } from './session-cookie-options';

/**
 * F3.1 — the session cookie is httpOnly.
 *
 * `@supabase/ssr` ships `httpOnly: false` in its own DEFAULT_COOKIE_OPTIONS, so
 * this is a correction, not a restatement. These cases pin the correction down;
 * `session-client.test.ts` proves the client actually applies it.
 */
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
    });
  });

  it('does not mutate the options it was handed', () => {
    const original: CookieOptions = { httpOnly: false, path: '/' };
    toSessionCookieOptions(original);
    expect(original.httpOnly).toBe(false);
  });
});
