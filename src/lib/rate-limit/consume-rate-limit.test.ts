// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * F4.10a's acceptance criterion, against real Postgres.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is here
 * because the claim being made is about a **security control written in SQL**:
 * "the 61st request is refused, the window resets, two learners do not share a
 * bucket". Nothing in TypeScript can be typechecked to establish that, and a
 * rate limiter that silently allows everything looks identical from the outside
 * to one that works — right up until it matters.
 *
 * PGlite is real Postgres in-process. `now()` is transactional, so each call
 * runs in its own implicit transaction and the window arithmetic is genuine.
 */
const MIGRATIONS_DIR = 'supabase/migrations';

const AUTH_SHIM = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  do $$ begin create role anon; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
  grant usage on schema auth to anon, authenticated, service_role;
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`;

interface IDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retry_after_seconds: number;
}

let db: PGlite;

async function consume(bucket: string, limit = 60, windowSeconds = 60): Promise<IDecision> {
  const result = await db.query<IDecision>(
    'select * from public.consume_rate_limit($1, $2, $3)',
    [bucket, limit, windowSeconds],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('consume_rate_limit returned no row');
  }

  return row;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
  await db.exec(AUTH_SHIM);

  for (const name of readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
  }
}, 60_000);

describe('consume_rate_limit', () => {
  it('allows 60 requests in the window and refuses the 61st', async () => {
    const bucket = 'submit:learner-a';

    for (let n = 1; n <= 60; n += 1) {
      const decision = await consume(bucket);

      expect(decision.allowed, `request ${String(n)} should be allowed`).toBe(true);
    }

    const sixtyFirst = await consume(bucket);

    expect(sixtyFirst.allowed).toBe(false);
    expect(sixtyFirst.remaining).toBe(0);
    expect(sixtyFirst.retry_after_seconds).toBeGreaterThan(0);
  }, 30_000);

  it('counts down the allowance as it goes', async () => {
    const bucket = 'countdown:learner-a';

    expect((await consume(bucket, 3, 60)).remaining).toBe(2);
    expect((await consume(bucket, 3, 60)).remaining).toBe(1);
    expect((await consume(bucket, 3, 60)).remaining).toBe(0);
  });

  it('resets when the window has passed', async () => {
    const bucket = 'reset:learner-a';

    expect((await consume(bucket, 1, 60)).allowed).toBe(true);
    expect((await consume(bucket, 1, 60)).allowed).toBe(false);

    // Age the window rather than sleeping for a minute. This is the same row
    // the function reads, so the reset branch is genuinely exercised.
    await db.query("update public.rate_limits set window_started_at = now() - interval '61 seconds' where bucket = $1", [bucket]);

    const afterReset = await consume(bucket, 1, 60);

    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(0);
  });

  it('gives two learners separate buckets', async () => {
    // The whole point of keying by subject. If this shares, one busy learner
    // locks out everybody behind the same office NAT.
    expect((await consume('shared-rule:learner-b', 1, 60)).allowed).toBe(true);
    expect((await consume('shared-rule:learner-b', 1, 60)).allowed).toBe(false);

    expect((await consume('shared-rule:learner-c', 1, 60)).allowed).toBe(true);
  });

  it('refuses a nonsensical rule rather than dividing by it', async () => {
    await expect(consume('bad:rule', 0, 60)).rejects.toThrow(/positive limit and window/);
  });

  it('is unreachable by a client role', async () => {
    // 012 revokes execute from public, anon and authenticated. Without that,
    // a learner could spend anybody's allowance to zero.
    await db.exec('set role authenticated;');
    try {
      await expect(consume('privilege:probe', 60, 60)).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec('reset role;');
    }
  });
});
