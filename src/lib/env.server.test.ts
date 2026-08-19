// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * F3.9 found this the hard way: the first import of `env.server` from a route
 * that a build pre-renders took the whole build down over a variable no feature
 * uses yet. These pin the two halves of the rule — blank optional is absent,
 * blank required is still a failure.
 */

const VALID = {
  NODE_ENV: 'test',
  SUPABASE_SERVICE_ROLE_KEY: 'a-service-role-key',
  DATABASE_URL: 'postgresql://localhost/db',
} as const;

vi.mock('server-only', () => ({}));

async function loadWith(overrides: Record<string, string>): Promise<{
  readonly CRON_SECRET?: string | undefined;
}> {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) {
    vi.stubEnv(key, value);
  }
  const loaded = await import('./env.server');
  return loaded.serverEnv;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('CRON_SECRET', () => {
  it('is absent when the line in the env file is empty', async () => {
    // `.env.example` ships `CRON_SECRET=`. That has to boot.
    await expect(loadWith({ CRON_SECRET: '' })).resolves.toHaveProperty('CRON_SECRET', undefined);
  });

  it('is absent when the line holds only whitespace', async () => {
    await expect(loadWith({ CRON_SECRET: '   ' })).resolves.toHaveProperty(
      'CRON_SECRET',
      undefined,
    );
  });

  it('is read when it is actually set', async () => {
    const env = await loadWith({ CRON_SECRET: 'a-secret-of-sufficient-length' });

    expect(env.CRON_SECRET).toBe('a-secret-of-sufficient-length');
  });

  it('still refuses a value too short to be a secret', async () => {
    await expect(loadWith({ CRON_SECRET: 'short' })).rejects.toThrow('CRON_SECRET');
  });
});

describe('the required variables', () => {
  it('refuses to boot when one is blank, and names it', async () => {
    // Blank-is-absent must not spread to these: an empty service role key is a
    // misconfiguration, not an opt-out.
    await expect(loadWith({ SUPABASE_SERVICE_ROLE_KEY: '' })).rejects.toThrow(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
  });

  it('names the variable rather than describing the problem in general', async () => {
    await expect(loadWith({ DATABASE_URL: '' })).rejects.toThrow(/DATABASE_URL/u);
  });
});
