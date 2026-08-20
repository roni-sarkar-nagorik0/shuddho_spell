// @vitest-environment node
/**
 * F5.4's criterion: **a mid-write failure rolls back attempts, review items,
 * mastery and streak together.**
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This one is here
 * because the entire feature *is* the atomicity claim. Everything typechecks
 * identically whether the four writes share a transaction or not, and the
 * failure mode — a learner whose review ladder advanced and whose mastery did
 * not — is silent, permanent, and invisible until the numbers stop agreeing
 * weeks later.
 *
 * PGlite is real Postgres in-process, so a raised exception inside the function
 * rolls back exactly as production would.
 */
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

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

let db: PGlite;
let sessionId: string;
let profileId: string;
let wordId: string;
let ruleFamilyId: string;

async function countOf(table: string): Promise<number> {
  const result = await db.query<{ readonly n: string }>(`select count(*)::text as n from public.${table}`);

  return Number(result.rows[0]?.n ?? '0');
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
  await db.exec(AUTH_SHIM);

  for (const name of readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
  }

  const user = await db.query<{ readonly id: string }>(
    "insert into auth.users (email) values ('a@b.c') returning id",
  );
  const userId = user.rows[0]?.id ?? '';

  // 009's signup trigger already made the profile the moment the auth.users
  // row appeared — inserting one here duplicates it.
  const profile = await db.query<{ readonly id: string }>(
    'select id from public.learner_profiles where user_id = $1',
    [userId],
  );
  profileId = profile.rows[0]?.id ?? '';

  const session = await db.query<{ readonly id: string }>(
    "insert into public.lesson_sessions (profile_id, day_index, stage) values ($1, 1, 'dictate') returning id",
    [profileId],
  );
  sessionId = session.rows[0]?.id ?? '';

  const family = await db.query<{ readonly id: string }>(
    `insert into public.rule_families (code, statement, examples, counterexamples)
     values ('doubling', 'Double it.', array['a','b','c'], array['d','e']) returning id`,
  );
  ruleFamilyId = family.rows[0]?.id ?? '';

  const word = await db.query<{ readonly id: string }>(
    `insert into public.words (text, ipa, syllables, bangla_sound, bangla_meaning, part_of_speech, week_index)
     values ('running', 'ˈrʌnɪŋ', array['run','ning'], 'রানিং', 'দৌড়ানো', 'verb', 1) returning id`,
  );
  wordId = word.rows[0]?.id ?? '';
}, 90_000);

function attemptPayload(): Record<string, unknown> {
  return {
    item_type: 'word',
    item_id: wordId,
    mode: 'dictation',
    submitted_value: 'runing',
    is_correct: false,
    score: 0,
    error_tags: ['DOUBLE_CONSONANT'],
    latency_ms: 1200,
  };
}

function reviewPayload(): Record<string, unknown> {
  return {
    item_id: wordId,
    item_type: 'word',
    interval_index: 0,
    due_at: '2026-08-20T00:00:00Z',
    times_seen: 1,
    times_correct: 0,
    consecutive_correct: 0,
    last_correct_on: null,
    is_mastered: false,
    last_error_tags: ['DOUBLE_CONSONANT'],
  };
}

describe('record_lesson_attempt', () => {
  it('writes the attempt, the counters, the ladder and the mastery together', async () => {
    await db.query('select public.record_lesson_attempt($1, $2, $3, $4)', [
      sessionId,
      JSON.stringify(attemptPayload()),
      JSON.stringify(reviewPayload()),
      JSON.stringify([
        { dimension: 'rule_family', dimension_id: ruleFamilyId, attempts: 1, correct: 0, accuracy: 0 },
      ]),
    ]);

    expect(await countOf('attempts')).toBe(1);
    expect(await countOf('review_items')).toBe(1);
    expect(await countOf('mastery_records')).toBe(1);

    const session = await db.query<{ readonly items_total: number; readonly items_correct: number }>(
      'select items_total, items_correct from public.lesson_sessions where id = $1',
      [sessionId],
    );

    expect(session.rows[0]?.items_total).toBe(1);
    expect(session.rows[0]?.items_correct).toBe(0);
  });

  it('rolls every one of them back when the write fails part way', async () => {
    const before = {
      attempts: await countOf('attempts'),
      reviews: await countOf('review_items'),
      mastery: await countOf('mastery_records'),
    };

    // The mastery payload carries a dimension 003's check constraint forbids.
    // `dimension_id` is polymorphic and has no foreign key — it points at a
    // phoneme or a rule family — so a bogus id would have been accepted; the
    // check constraint is what actually rejects.
    //
    // By the time it fires, the attempt row, the counter update and the review
    // upsert have all already run. That is precisely the mid-write failure.
    await expect(
      db.query('select public.record_lesson_attempt($1, $2, $3, $4)', [
        sessionId,
        JSON.stringify({ ...attemptPayload(), submitted_value: 'runnning' }),
        JSON.stringify({ ...reviewPayload(), times_seen: 99 }),
        JSON.stringify([
          {
            dimension: 'not_a_dimension',
            dimension_id: ruleFamilyId,
            attempts: 1,
            correct: 0,
            accuracy: 0,
          },
        ]),
      ]),
    ).rejects.toThrow();

    expect(await countOf('attempts'), 'the attempt survived a failed transaction').toBe(before.attempts);
    expect(await countOf('mastery_records')).toBe(before.mastery);

    const review = await db.query<{ readonly times_seen: number }>(
      'select times_seen from public.review_items where profile_id = $1',
      [profileId],
    );

    expect(review.rows[0]?.times_seen, 'the ladder advanced inside a rolled-back write').toBe(1);
  });

  it('refuses a payload naming a session that does not exist', async () => {
    await expect(
      db.query('select public.record_lesson_attempt($1, $2, null, $3)', [
        '00000000-0000-0000-0000-000000000000',
        JSON.stringify(attemptPayload()),
        JSON.stringify([]),
      ]),
    ).rejects.toThrow(/does not exist/u);
  });

  it('is unreachable by a client role', async () => {
    await db.exec('set role authenticated;');
    try {
      await expect(
        db.query('select public.record_lesson_attempt($1, $2, null, $3)', [
          sessionId,
          JSON.stringify(attemptPayload()),
          JSON.stringify([]),
        ]),
      ).rejects.toThrow(/permission denied/iu);
    } finally {
      await db.exec('reset role;');
    }
  });
});

describe('complete_lesson_day', () => {
  it('closes the session, upserts the streak and advances the learner at once', async () => {
    await db.query('select public.complete_lesson_day($1, $2, $3, $4, $5)', [
      sessionId,
      10,
      8,
      JSON.stringify({
        current_streak: 3,
        longest_streak: 5,
        last_active_date: '2026-08-19',
        freezes_remaining: 1,
      }),
      2,
    ]);

    const session = await db.query<{ readonly completed_at: string | null }>(
      'select completed_at from public.lesson_sessions where id = $1',
      [sessionId],
    );
    const profile = await db.query<{ readonly current_day_index: number }>(
      'select current_day_index from public.learner_profiles where id = $1',
      [profileId],
    );

    expect(session.rows[0]?.completed_at).not.toBeNull();
    expect(await countOf('streak_records')).toBe(1);
    expect(profile.rows[0]?.current_day_index).toBe(2);
  });

  it('leaves the learner where they are when the day index is null', async () => {
    // The revisit case: finishing day 3 again must not move somebody on day 7.
    await db.query('select public.complete_lesson_day($1, $2, $3, null, null)', [sessionId, 10, 8]);

    const profile = await db.query<{ readonly current_day_index: number }>(
      'select current_day_index from public.learner_profiles where id = $1',
      [profileId],
    );

    expect(profile.rows[0]?.current_day_index).toBe(2);
  });
});
