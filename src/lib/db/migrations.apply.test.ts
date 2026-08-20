// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * "The migration applies from empty" proved by applying it, not by reading it.
 *
 * PGlite is a real Postgres compiled to WASM, running in this process — no
 * Docker, no local stack, no network. Production is hosted Supabase, so this
 * cannot prove anything Supabase-specific (pg_cron, auth.users, the service
 * role); it proves the SQL is valid Postgres and that the conventions in
 * `03-database.md` hold on the tables it actually creates.
 */

const MIGRATIONS_DIR = 'supabase/migrations';

const migrations: readonly string[] = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

/**
 * Supabase provides `auth.users`; a bare Postgres does not. The learner profile
 * hangs off it, so the test database needs the same anchor before 003 can apply.
 * This stands in for exactly what Supabase supplies — nothing more.
 */
const AUTH_SHIM = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id                   uuid primary key default gen_random_uuid(),
    email                text unique,
    -- Supabase stores the OAuth profile here; 009's signup trigger reads the
    -- display name out of it.
    raw_user_meta_data   jsonb not null default '{}'::jsonb
  );

  -- The three roles every Supabase project ships with. 008 revokes from and
  -- grants to them by name, so they must exist before it applies.
  do $$ begin create role anon; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;

  grant usage on schema auth to anon, authenticated, service_role;

  -- Supabase's own auth.uid(), reproduced exactly: the caller's id is read from
  -- the request's JWT claims, which PostgREST sets per request. A test drives it
  -- with set_config the same way.
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select case
      when coalesce(current_setting('request.jwt.claims', true), '') = '' then null
      else (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
    end
  $$;
`;

async function applyAll(db: PGlite): Promise<void> {
  for (const name of migrations) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
  }
}

const CONTENT_TABLES: readonly string[] = [
  'phonemes',
  'program_day_items',
  'program_days',
  'rule_families',
  'sentence_items',
  'word_phonemes',
  'words',
];

/** Every one of these is private to one learner and carries `profile_id`. */
const LEARNER_TABLES: readonly string[] = [
  'attempts',
  'certificates',
  'exam_answers',
  'exam_attempts',
  'lesson_sessions',
  'mastery_records',
  'notification_preferences',
  'notifications',
  'push_subscriptions',
  'review_items',
  'streak_records',
];

/** Global exam content, plus exam_questions, which belongs to an attempt. */
const EXAM_TABLES: readonly string[] = ['exam_definitions', 'exam_sections', 'exam_questions'];

const EXPECTED_TABLES: readonly string[] = [
  ...CONTENT_TABLES,
  ...LEARNER_TABLES,
  ...EXAM_TABLES,
  // The root of the learner graph: owned by an auth.users row, not by a profile.
  'learner_profiles',
  // Not learner data and not content: a platform counter, added by 012 for the
  // rate limiting `11-api-surface.md` requires on every write route.
  'rate_limits',
]
  .slice()
  .sort();

interface IColumnRow {
  readonly table_name: string;
  readonly column_name: string;
  readonly data_type: string;
  readonly is_nullable: string;
  readonly column_default: string | null;
}

describe('migrations against an empty database', () => {
  let db: PGlite;
  let columns: readonly IColumnRow[] = [];

  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
    await db.exec(AUTH_SHIM);
    await applyAll(db);
    const result = await db.query<IColumnRow>(
      `select table_name, column_name, data_type, is_nullable, column_default
         from information_schema.columns
        where table_schema = 'public'`,
    );
    columns = result.rows;
  }, 60_000);

  it('applies every migration from empty', () => {
    expect(migrations.length).toBeGreaterThan(0);
    // beforeAll would have thrown on a syntax error or a bad reference.
    expect(columns.length).toBeGreaterThan(0);
  });

  it('creates exactly the tables the design names', async () => {
    const result = await db.query<{ readonly table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual([...EXPECTED_TABLES]);
  });

  it('gives every table id, created_at and updated_at', () => {
    for (const table of EXPECTED_TABLES) {
      const own = columns.filter((column) => column.table_name === table);

      const id = own.find((column) => column.column_name === 'id');
      expect(id, `${table}.id is missing`).toBeDefined();
      expect(id?.data_type, `${table}.id is not uuid`).toBe('uuid');
      expect(id?.column_default ?? '', `${table}.id has no gen_random_uuid() default`).toContain(
        'gen_random_uuid()',
      );

      for (const name of ['created_at', 'updated_at']) {
        const stamp = own.find((column) => column.column_name === name);
        expect(stamp, `${table}.${name} is missing`).toBeDefined();
        expect(stamp?.data_type, `${table}.${name} is not timestamptz`).toBe(
          'timestamp with time zone',
        );
        expect(stamp?.is_nullable, `${table}.${name} is nullable`).toBe('NO');
        expect(stamp?.column_default ?? '', `${table}.${name} has no now() default`).toContain(
          'now()',
        );
      }
    }
  });

  it('makes id the primary key of every table', async () => {
    const result = await db.query<{ readonly table_name: string; readonly column_name: string }>(
      `select tc.table_name, kcu.column_name
         from information_schema.table_constraints tc
         join information_schema.key_column_usage kcu
           on kcu.constraint_name = tc.constraint_name
        where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'
        order by tc.table_name`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual([...EXPECTED_TABLES]);
    for (const row of result.rows) {
      expect(row.column_name, `${row.table_name} is keyed on something other than id`).toBe('id');
    }
  });

  it('turns row level security on for every table', async () => {
    const result = await db.query<{ readonly relname: string; readonly relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
        where relnamespace = 'public'::regnamespace and relkind = 'r'
        order by relname`,
    );
    for (const row of result.rows) {
      expect(row.relrowsecurity, `RLS is off on ${row.relname}`).toBe(true);
    }
  });

  it('rejects a value outside an enumerated column', async () => {
    await expect(
      db.query(
        `insert into public.phonemes (symbol, type, articulation_note)
         values ('/x/', 'click', 'not an English sound class')`,
      ),
    ).rejects.toThrow(/phonemes_type_check/);
  });

  it('rejects a rule family without its three examples and two counterexamples', async () => {
    await expect(
      db.query(
        `insert into public.rule_families (code, statement, examples, counterexamples)
         values ('doubling', 'Double the final consonant.', array['stopping'], array['visiting', 'opening'])`,
      ),
    ).rejects.toThrow(/rule_families_examples_count/);
  });

  it('accepts well-formed content and stamps it', async () => {
    const inserted = await db.query<{ readonly id: string; readonly created_at: Date }>(
      `insert into public.phonemes (symbol, type, bangla_equivalent, articulation_note, common_bengali_substitution)
       values ('/v/', 'consonant', null, 'Labiodental fricative.', '/bʰ/ or /w/')
       returning id, created_at`,
    );
    const row = inserted.rows[0];
    expect(row).toBeDefined();
    expect(row?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row?.created_at).toBeInstanceOf(Date);
  });

  it('is idempotent — applying every migration a second time changes nothing', async () => {
    // Counted before and after rather than against a constant: 010 seeds 44
    // phonemes, the tests above add fixtures, and both numbers are free to
    // move. What must not move is the difference a second run makes.
    const countRows = async (): Promise<string> => {
      const result = await db.query<{ readonly count: string }>(
        `select count(*)::text as count from public.phonemes`,
      );
      return result.rows[0]?.count ?? '';
    };
    const before = await countRows();
    expect(before, 'nothing has been inserted, so the check would prove nothing').not.toBe('0');
    await applyAll(db);
    expect(await countRows(), 'a re-run dropped or duplicated data').toBe(before);
  }, 60_000);

  describe('learner tables', () => {
    it('gives every learner table a profile_id that cascades on delete', async () => {
      const result = await db.query<{
        readonly table_name: string;
        readonly column_name: string;
        readonly delete_rule: string;
        readonly foreign_table: string;
      }>(
        `select tc.table_name,
                kcu.column_name,
                rc.delete_rule,
                ccu.table_name as foreign_table
           from information_schema.table_constraints tc
           join information_schema.key_column_usage kcu
             on kcu.constraint_name = tc.constraint_name
           join information_schema.referential_constraints rc
             on rc.constraint_name = tc.constraint_name
           join information_schema.constraint_column_usage ccu
             on ccu.constraint_name = tc.constraint_name
          where tc.table_schema = 'public'
            and tc.constraint_type = 'FOREIGN KEY'
            and kcu.column_name = 'profile_id'`,
      );

      const byTable = new Map(result.rows.map((row) => [row.table_name, row]));
      for (const table of LEARNER_TABLES) {
        const fk = byTable.get(table);
        expect(fk, `${table} has no profile_id foreign key`).toBeDefined();
        expect(fk?.foreign_table, `${table}.profile_id points somewhere else`).toBe(
          'learner_profiles',
        );
        expect(fk?.delete_rule, `${table}.profile_id does not cascade`).toBe('CASCADE');
      }
    });

    it('anchors the profile to auth.users, cascading from there', async () => {
      const result = await db.query<{ readonly delete_rule: string }>(
        `select rc.delete_rule
           from information_schema.table_constraints tc
           join information_schema.key_column_usage kcu
             on kcu.constraint_name = tc.constraint_name
           join information_schema.referential_constraints rc
             on rc.constraint_name = tc.constraint_name
          where tc.table_name = 'learner_profiles'
            and tc.constraint_type = 'FOREIGN KEY'
            and kcu.column_name = 'user_id'`,
      );
      expect(result.rows[0]?.delete_rule).toBe('CASCADE');
    });

    it('deletes a learner completely when their user row goes', async () => {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ('cascade@example.com') returning id`,
      );
      const userId = user.rows[0]?.id;
      expect(userId).toBeDefined();

      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Cascade Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [userId],
      );
      const profileId = profile.rows[0]?.id;
      expect(profileId).toBeDefined();

      const session = await db.query<{ readonly id: string }>(
        `insert into public.lesson_sessions (profile_id, day_index)
         values ($1, 1) returning id`,
        [profileId],
      );
      const sessionId = session.rows[0]?.id;

      await db.query(
        `insert into public.attempts
           (session_id, profile_id, item_type, item_id, mode, submitted_value, is_correct, score, error_tags)
         values ($1, $2, 'word', gen_random_uuid(), 'dictation', 'stoping', false, 40.00,
                 array['DOUBLE_CONSONANT'])`,
        [sessionId, profileId],
      );
      await db.query(
        `insert into public.streak_records (profile_id, current_streak, longest_streak)
         values ($1, 1, 1)`,
        [profileId],
      );

      // An exam attempt with a question and an answer, so the cascade is proved
      // through the two-hop path (profile → attempt → question → answer) too.
      const definition = await db.query<{ readonly id: string }>(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint)
         values ('milestone1', 'Milestone 1', 2700, 60, 70.00, 3, 24, 7, 5)
         returning id`,
      );
      const attempt = await db.query<{ readonly id: string }>(
        `insert into public.exam_attempts
           (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
         values ($1, $2, 1, 'in_progress', now(), now() + interval '45 minutes', 'seed-cascade')
         returning id`,
        [profileId, definition.rows[0]?.id],
      );
      const question = await db.query<{ readonly id: string }>(
        `insert into public.exam_questions
           (attempt_id, section_code, order_index, type, payload, correct_answer)
         values ($1, 'dictation', 0, 'dictation', '{"prompt":"knowledge"}'::jsonb,
                 '{"value":"knowledge"}'::jsonb)
         returning id`,
        [attempt.rows[0]?.id],
      );
      await db.query(
        `insert into public.exam_answers (question_id, attempt_id, profile_id, submitted_value)
         values ($1, $2, $3, 'nowledge')`,
        [question.rows[0]?.id, attempt.rows[0]?.id, profileId],
      );

      await db.query(`delete from auth.users where id = $1`, [userId]);

      for (const table of ['learner_profiles', ...LEARNER_TABLES, 'exam_questions']) {
        const left = await db.query<{ readonly count: string }>(
          `select count(*)::text as count from public.${table}`,
        );
        expect(left.rows[0]?.count, `${table} kept a row after the user was deleted`).toBe('0');
      }
    });

    it('refuses an error tag that is not a named ErrorTag', async () => {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ('tags@example.com') returning id`,
      );
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Tag Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [user.rows[0]?.id],
      );
      const session = await db.query<{ readonly id: string }>(
        `insert into public.lesson_sessions (profile_id, day_index) values ($1, 2) returning id`,
        [profile.rows[0]?.id],
      );

      await expect(
        db.query(
          `insert into public.attempts
             (session_id, profile_id, item_type, item_id, mode, submitted_value, is_correct, score, error_tags)
           values ($1, $2, 'word', gen_random_uuid(), 'dictation', 'nowledge', false, 30.00,
                   array['TYPO_OF_A_TAG'])`,
          [session.rows[0]?.id, profile.rows[0]?.id],
        ),
      ).rejects.toThrow(/attempts_error_tags_known/);
    });

    it('stores scores as exact numerics, not floats', async () => {
      const result = await db.query<{ readonly data_type: string; readonly numeric_scale: number }>(
        `select data_type, numeric_scale from information_schema.columns
          where table_schema = 'public' and table_name = 'attempts' and column_name = 'score'`,
      );
      expect(result.rows[0]?.data_type).toBe('numeric');
      expect(result.rows[0]?.numeric_scale).toBe(2);
    });

    it('keeps a review item to one row per learner per item', async () => {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ('review@example.com') returning id`,
      );
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Review Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [user.rows[0]?.id],
      );
      const profileId = profile.rows[0]?.id;
      const itemId = '11111111-1111-1111-1111-111111111111';

      await db.query(
        `insert into public.review_items (profile_id, item_id, item_type, due_at)
         values ($1, $2, 'word', now())`,
        [profileId, itemId],
      );
      await expect(
        db.query(
          `insert into public.review_items (profile_id, item_id, item_type, due_at)
           values ($1, $2, 'word', now())`,
          [profileId, itemId],
        ),
      ).rejects.toThrow(/review_items_profile_item_unique/);
    });

    it('rejects a rung outside the five-step ladder', async () => {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ('ladder@example.com') returning id`,
      );
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Ladder Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [user.rows[0]?.id],
      );
      await expect(
        db.query(
          `insert into public.review_items (profile_id, item_id, item_type, interval_index, due_at)
           values ($1, gen_random_uuid(), 'word', 5, now())`,
          [profile.rows[0]?.id],
        ),
      ).rejects.toThrow(/review_items_interval_index_range/);
    });
  });

  describe('exam tables', () => {
    /**
     * Every exam test needs a learner and an exam to attach an attempt to. There
     * are only ever five exams and `code` is unique, so the definition is
     * upserted — a fresh insert per test would collide, which is the constraint
     * doing its job rather than a problem to work around.
     */
    async function fixture(email: string, code: string): Promise<{
      readonly profileId: string | undefined;
      readonly definitionId: string | undefined;
    }> {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ($1) returning id`,
        [email],
      );
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Exam Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [user.rows[0]?.id],
      );
      const definition = await db.query<{ readonly id: string }>(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint)
         values ($1, 'Exam', 3600, 80, 75.00, 3, 24, 14, 11)
         on conflict (code) do update set title = excluded.title
         returning id`,
        [code],
      );
      return { profileId: profile.rows[0]?.id, definitionId: definition.rows[0]?.id };
    }

    it('allows only one in-progress attempt per learner per exam', async () => {
      const { profileId, definitionId } = await fixture('active@example.com', 'milestone2');
      const start = `insert into public.exam_attempts
          (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
        values ($1, $2, $3, 'in_progress', now(), now() + interval '60 minutes', 'seed')`;

      await db.query(start, [profileId, definitionId, 1]);
      await expect(db.query(start, [profileId, definitionId, 2])).rejects.toThrow(
        /exam_attempts_one_active_per_exam/,
      );

      // Finishing the first frees the slot — the index is partial, not absolute.
      await db.query(
        `update public.exam_attempts
            set status = 'failed', submitted_at = now(), score_percent = 41.50, passed = false
          where profile_id = $1`,
        [profileId],
      );
      await db.query(start, [profileId, definitionId, 2]);
    });

    it('refuses a second answer to the same question', async () => {
      const { profileId, definitionId } = await fixture('answer@example.com', 'milestone3');
      const attempt = await db.query<{ readonly id: string }>(
        `insert into public.exam_attempts
           (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
         values ($1, $2, 1, 'in_progress', now(), now() + interval '60 minutes', 'seed')
         returning id`,
        [profileId, definitionId],
      );
      const question = await db.query<{ readonly id: string }>(
        `insert into public.exam_questions
           (attempt_id, section_code, order_index, type, payload, correct_answer)
         values ($1, 'grammar_and_construction', 0, 'construction', '{}'::jsonb, '{}'::jsonb)
         returning id`,
        [attempt.rows[0]?.id],
      );
      const save = `insert into public.exam_answers (question_id, attempt_id, profile_id, submitted_value)
                    values ($1, $2, $3, 'an answer')`;

      await db.query(save, [question.rows[0]?.id, attempt.rows[0]?.id, profileId]);
      await expect(
        db.query(save, [question.rows[0]?.id, attempt.rows[0]?.id, profileId]),
      ).rejects.toThrow(/exam_answers_question_unique/);
    });

    it('refuses an exam that is graded only halfway', async () => {
      await expect(
        db.query(
          `insert into public.exam_definitions
             (code, title, duration_seconds, question_count, pass_percent,
              unlock_day_standard, unlock_day_sprint)
           values ('final', 'Final', 7200, 150, 80.00, 28, 21)`,
        ),
      ).rejects.toThrow(/exam_definitions_grading_complete/);
    });

    it('accepts the diagnostic, which is ungraded by design', async () => {
      const result = await db.query<{ readonly pass_percent: string | null }>(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, unlock_day_standard, unlock_day_sprint)
         values ('diagnostic', 'Diagnostic', 1200, 30, 0, 0)
         returning pass_percent`,
      );
      expect(result.rows[0]?.pass_percent).toBeNull();
    });

    it('will not let an attempt be in progress without a deadline', async () => {
      const { profileId, definitionId } = await fixture('nodeadline@example.com', 'milestone1');
      await expect(
        db.query(
          `insert into public.exam_attempts
             (profile_id, definition_id, attempt_number, status, started_at, seed)
           values ($1, $2, 1, 'in_progress', now(), 'seed')`,
          [profileId, definitionId],
        ),
      ).rejects.toThrow(/exam_attempts_started_has_deadline/);
    });

    it('will not let an attempt be passed without a recorded outcome', async () => {
      const { profileId, definitionId } = await fixture('nooutcome@example.com', 'final');
      await expect(
        db.query(
          `insert into public.exam_attempts
             (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
           values ($1, $2, 1, 'passed', now(), now() + interval '120 minutes', 'seed')`,
          [profileId, definitionId],
        ),
      ).rejects.toThrow(/exam_attempts_finished_has_outcome/);
    });

    it('scores exams as exact numerics, not floats', async () => {
      const result = await db.query<{
        readonly table_name: string;
        readonly column_name: string;
        readonly data_type: string;
      }>(
        `select table_name, column_name, data_type from information_schema.columns
          where table_schema = 'public'
            and column_name in ('score_percent', 'weight', 'awarded_points', 'pass_percent')
          order by table_name, column_name`,
      );
      expect(result.rows.length).toBeGreaterThan(0);
      for (const row of result.rows) {
        expect(row.data_type, `${row.table_name}.${row.column_name} is not numeric`).toBe('numeric');
      }
    });
  });
  describe('notification tables', () => {
    async function learner(email: string): Promise<string | undefined> {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ($1) returning id`,
        [email],
      );
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Notify Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [user.rows[0]?.id],
      );
      return profile.rows[0]?.id;
    }

    /**
     * The feature's stated test. A cron invocation can be retried by the platform
     * after a timeout, having already sent half its batch; this key is the only
     * thing between that and a double-send.
     */
    it('refuses a second notification for the same learner, type and scheduled window', async () => {
      const profileId = await learner('idempotent@example.com');
      const send = `insert into public.notifications
                      (profile_id, type, title, body, scheduled_for)
                    values ($1, 'daily_reminder', 'Day 12 is ready', 'Twenty-five minutes today.',
                            timestamptz '2026-03-04 20:00:00+06')`;

      await db.query(send, [profileId]);
      await expect(db.query(send, [profileId])).rejects.toThrow(
        /notifications_idempotency_unique/,
      );

      const rows = await db.query<{ readonly count: string }>(
        `select count(*)::text as count from public.notifications where profile_id = $1`,
        [profileId],
      );
      expect(rows.rows[0]?.count, 'the retry got through').toBe('1');
    });

    it('carries the idempotency key on exactly (profile_id, type, scheduled_for)', async () => {
      const result = await db.query<{ readonly column_name: string }>(
        `select kcu.column_name
           from information_schema.table_constraints tc
           join information_schema.key_column_usage kcu
             on kcu.constraint_name = tc.constraint_name
          where tc.table_schema = 'public'
            and tc.table_name = 'notifications'
            and tc.constraint_name = 'notifications_idempotency_unique'
          order by kcu.ordinal_position`,
      );
      expect(result.rows.map((row) => row.column_name)).toEqual([
        'profile_id',
        'type',
        'scheduled_for',
      ]);
    });

    it('lets tomorrow through — the key is scoped to the window, not to the type', async () => {
      const profileId = await learner('tomorrow@example.com');
      const send = `insert into public.notifications
                      (profile_id, type, title, body, scheduled_for)
                    values ($1, 'daily_reminder', 'Ready', 'Body', $2)`;

      await db.query(send, [profileId, '2026-03-04 20:00:00+06']);
      await db.query(send, [profileId, '2026-03-05 20:00:00+06']);

      const rows = await db.query<{ readonly count: string }>(
        `select count(*)::text as count from public.notifications where profile_id = $1`,
        [profileId],
      );
      expect(rows.rows[0]?.count).toBe('2');
    });

    it('refuses a notification type that is not a named NotificationType', async () => {
      const profileId = await learner('badtype@example.com');
      await expect(
        db.query(
          `insert into public.notifications (profile_id, type, title, body, scheduled_for)
           values ($1, 'marketing_blast', 'Buy', 'Now', now())`,
          [profileId],
        ),
      ).rejects.toThrow(/notifications_type_check/);
    });

    it('refuses a delivery channel that does not exist', async () => {
      const profileId = await learner('badchannel@example.com');
      await expect(
        db.query(
          `insert into public.notifications
             (profile_id, type, title, body, scheduled_for, channels_delivered)
           values ($1, 'exam_result', 'Result', 'Body', now(), array['sms'])`,
          [profileId],
        ),
      ).rejects.toThrow(/notifications_channels_delivered_check/);
    });

    /**
     * Email is deferred to v2 and never written today. The point of this test is
     * that adding it then needs no migration — the schema already permits it.
     */
    it('permits the email channel it will not use until v2', async () => {
      const profileId = await learner('v2door@example.com');
      await db.query(
        `insert into public.notification_preferences (profile_id, type, channel, enabled)
         values ($1, 'weekly_report', 'email', false)`,
        [profileId],
      );
      const rows = await db.query<{ readonly count: string }>(
        `select count(*)::text as count from public.notification_preferences
          where profile_id = $1 and channel = 'email'`,
        [profileId],
      );
      expect(rows.rows[0]?.count).toBe('1');
    });

    it('keeps one preference per learner, type and channel', async () => {
      const profileId = await learner('prefs@example.com');
      const pref = `insert into public.notification_preferences (profile_id, type, channel)
                    values ($1, 'daily_reminder', 'push')`;

      await db.query(pref, [profileId]);
      await expect(db.query(pref, [profileId])).rejects.toThrow(
        /notification_preferences_unique/,
      );

      // The same type on the other live channel is a different preference.
      await db.query(
        `insert into public.notification_preferences (profile_id, type, channel)
         values ($1, 'daily_reminder', 'in_app')`,
        [profileId],
      );
    });

    it('accepts quiet hours that wrap midnight', async () => {
      const profileId = await learner('quiet@example.com');
      const result = await db.query<{
        readonly quiet_hours_start: string;
        readonly quiet_hours_end: string;
      }>(
        `insert into public.notification_preferences
           (profile_id, type, channel, quiet_hours_start, quiet_hours_end, reminder_time)
         values ($1, 'daily_reminder', 'push', '22:00', '07:00', '20:00')
         returning quiet_hours_start, quiet_hours_end`,
        [profileId],
      );
      expect(result.rows[0]?.quiet_hours_start).toBe('22:00:00');
      expect(result.rows[0]?.quiet_hours_end).toBe('07:00:00');
    });

    it('refuses half a quiet-hours window', async () => {
      const profileId = await learner('halfquiet@example.com');
      await expect(
        db.query(
          `insert into public.notification_preferences
             (profile_id, type, channel, quiet_hours_start)
           values ($1, 'daily_reminder', 'push', '22:00')`,
          [profileId],
        ),
      ).rejects.toThrow(/notification_preferences_quiet_hours_paired/);
    });

    it('refuses a push subscription that cannot be encrypted to', async () => {
      const profileId = await learner('nokeys@example.com');
      await expect(
        db.query(
          `insert into public.push_subscriptions (profile_id, endpoint, keys)
           values ($1, 'https://push.example.com/a', '{"p256dh":"key"}'::jsonb)`,
          [profileId],
        ),
      ).rejects.toThrow(/push_subscriptions_keys_complete/);
    });

    it('treats a push endpoint as one browser, not one per learner', async () => {
      const first = await learner('device-a@example.com');
      const second = await learner('device-b@example.com');
      const subscribe = `insert into public.push_subscriptions (profile_id, endpoint, keys)
                         values ($1, 'https://push.example.com/shared',
                                 '{"p256dh":"key","auth":"secret"}'::jsonb)`;

      await db.query(subscribe, [first]);
      await expect(db.query(subscribe, [second])).rejects.toThrow(
        /push_subscriptions_endpoint_key/,
      );
    });
  });

  describe('certificates', () => {
    /** A certificate needs a learner who passed the final. */
    async function passedFinal(email: string): Promise<{
      readonly profileId: string | undefined;
      readonly attemptId: string | undefined;
    }> {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ($1) returning id`,
        [email],
      );
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Certificate Test')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [user.rows[0]?.id],
      );
      const definition = await db.query<{ readonly id: string }>(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint)
         values ('final', 'Final', 7200, 150, 80.00, 2, 48, 28, 21)
         on conflict (code) do update set title = excluded.title
         returning id`,
      );
      const attempt = await db.query<{ readonly id: string }>(
        `insert into public.exam_attempts
           (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at,
            submitted_at, score_percent, passed, seed)
         values ($1, $2, 1, 'passed', now(), now() + interval '120 minutes', now(), 86.50, true,
                 'seed-cert')
         returning id`,
        [profile.rows[0]?.id, definition.rows[0]?.id],
      );
      return { profileId: profile.rows[0]?.id, attemptId: attempt.rows[0]?.id };
    }

    it('issues one certificate per passed attempt, and only one', async () => {
      const { profileId, attemptId } = await passedFinal('cert-one@example.com');
      const issue = `insert into public.certificates
                       (profile_id, exam_attempt_id, verification_code, learner_name, track,
                        score_percent)
                     values ($1, $2, $3, 'Certificate Test', 'standard28', 86.50)`;

      await db.query(issue, [profileId, attemptId, 'A1B2-C3D4-E5F6']);
      await expect(
        db.query(issue, [profileId, attemptId, 'Z9Y8-X7W6-V5U4']),
      ).rejects.toThrow(/certificates_attempt_unique/);
    });

    it('refuses a verification code that cannot be read off a screen', async () => {
      const { profileId, attemptId } = await passedFinal('cert-format@example.com');
      await expect(
        db.query(
          `insert into public.certificates
             (profile_id, exam_attempt_id, verification_code, learner_name, track, score_percent)
           values ($1, $2, 'a1b2c3d4e5f6', 'Certificate Test', 'standard28', 86.50)`,
          [profileId, attemptId],
        ),
      ).rejects.toThrow(/certificates_verification_code_format/);
    });

    it('keeps a verification code unique across every certificate ever issued', async () => {
      const first = await passedFinal('cert-dup-a@example.com');
      const second = await passedFinal('cert-dup-b@example.com');
      const issue = `insert into public.certificates
                       (profile_id, exam_attempt_id, verification_code, learner_name, track,
                        score_percent)
                     values ($1, $2, 'DUP1-DUP2-DUP3', 'Certificate Test', 'standard28', 86.50)`;

      await db.query(issue, [first.profileId, first.attemptId]);
      await expect(db.query(issue, [second.profileId, second.attemptId])).rejects.toThrow(
        /certificates_verification_code_key/,
      );
    });

    it('will not let the attempt behind an issued certificate be deleted', async () => {
      const { profileId, attemptId } = await passedFinal('cert-restrict@example.com');
      await db.query(
        `insert into public.certificates
           (profile_id, exam_attempt_id, verification_code, learner_name, track, score_percent)
         values ($1, $2, 'KEEP-THIS-ROW1', 'Certificate Test', 'standard28', 86.50)`,
        [profileId, attemptId],
      );
      await expect(
        db.query(`delete from public.exam_attempts where id = $1`, [attemptId]),
      ).rejects.toThrow(/certificates_exam_attempt_id_fkey/);
    });

    it('refuses a revocation with no reason', async () => {
      const { profileId, attemptId } = await passedFinal('cert-revoke@example.com');
      await db.query(
        `insert into public.certificates
           (profile_id, exam_attempt_id, verification_code, learner_name, track, score_percent)
         values ($1, $2, 'REVO-KE12-3456', 'Certificate Test', 'standard28', 86.50)`,
        [profileId, attemptId],
      );
      await expect(
        db.query(
          `update public.certificates set revoked_at = now() where exam_attempt_id = $1`,
          [attemptId],
        ),
      ).rejects.toThrow(/certificates_revocation_has_reason/);

      // Revoking properly is an update, never a delete: a revoked certificate
      // must still verify — as revoked.
      await db.query(
        `update public.certificates
            set revoked_at = now(), revoked_reason = 'Issued against a voided attempt.'
          where exam_attempt_id = $1`,
        [attemptId],
      );
    });
  });

  /**
   * F2.5 — the indexes in 007 are proved by planning the queries their comments
   * name, not by reading the SQL. A seeded table is the point: on an empty one
   * the planner sequentially scans everything and an unused index looks
   * identical to a missing one.
   */
  describe('007 indexes', () => {
    let profileId = '';
    let sessionId = '';
    let ruleFamilyId = '';

    beforeAll(async () => {
      // 150 learners so a single-profile predicate is ~0.7% of each table and
      // the planner has a real reason to prefer the index.
      await db.exec(`
        insert into auth.users (id, email)
        select gen_random_uuid(), 'idx-fixture-' || g || '@example.com'
          from generate_series(1, 150) g;

        insert into public.learner_profiles (user_id, display_name)
        select id, 'Index Fixture'
          from auth.users
         where email like 'idx-fixture-%'
        on conflict (user_id) do update set display_name = excluded.display_name;

        insert into public.review_items (profile_id, item_id, item_type, due_at)
        select p.id, gen_random_uuid(), 'word', now() + ((g - 10) || ' hours')::interval
          from public.learner_profiles p, generate_series(1, 20) g
         where p.display_name = 'Index Fixture';

        insert into public.lesson_sessions (profile_id, day_index)
        select p.id, g
          from public.learner_profiles p, generate_series(1, 28) g
         where p.display_name = 'Index Fixture';

        insert into public.attempts
          (session_id, profile_id, item_type, item_id, mode, submitted_value, is_correct, score)
        select s.id, s.profile_id, 'word', gen_random_uuid(), 'dictation', 'beautiful', true, 100
          from public.lesson_sessions s, generate_series(1, 2) g;

        insert into public.notifications (profile_id, type, title, body, scheduled_for, sent_at, read_at)
        select p.id, 'daily_reminder', 'Day is waiting', 'Ten minutes.',
               now() - (g || ' days')::interval, now() - (g || ' days')::interval,
               case when g % 3 = 0 then null else now() end
          from public.learner_profiles p, generate_series(1, 20) g
         where p.display_name = 'Index Fixture';

        insert into public.rule_families (code, statement, examples, counterexamples)
        select 'IDX_RF_' || g, 'A fixture rule family.',
               array['one', 'two', 'three'], array['four', 'five']
          from generate_series(1, 20) g;

        insert into public.words
          (text, ipa, syllables, bangla_sound, bangla_meaning, part_of_speech, rule_family_id, week_index)
        select 'idxword' || g || '_' || replace(r.id::text, '-', ''), 'ˈbjuː-tɪ-fʊl',
               array['beau', 'ti', 'ful'], 'বিউটিফুল', 'সুন্দর', 'noun', r.id, 1 + (g % 4)
          from public.rule_families r, generate_series(1, 50) g
         where r.code like 'IDX_RF_%';

        analyze;
      `);

      const profile = await db.query<{ readonly id: string }>(
        `select id from public.learner_profiles where display_name = 'Index Fixture' limit 1`,
      );
      profileId = profile.rows[0]?.id ?? '';

      const session = await db.query<{ readonly id: string }>(
        `select id from public.lesson_sessions where profile_id = $1 limit 1`,
        [profileId],
      );
      sessionId = session.rows[0]?.id ?? '';

      const family = await db.query<{ readonly id: string }>(
        `select id from public.rule_families where code like 'IDX_RF_%' limit 1`,
      );
      ruleFamilyId = family.rows[0]?.id ?? '';
    }, 120_000);

    /** The plan as text. `costs off` keeps the assertion about access path, not estimates. */
    async function planFor(sql: string): Promise<string> {
      const result = await db.query<Record<string, string>>(`explain (costs off) ${sql}`);
      return result.rows.map((row) => Object.values(row).join(' ')).join('\n');
    }

    it('seeded enough rows for the planner to have a choice', () => {
      expect(profileId).not.toBe('');
      expect(sessionId).not.toBe('');
      expect(ruleFamilyId).not.toBe('');
    });

    it('every index 007 creates exists on the database', async () => {
      const result = await db.query<{ readonly indexname: string }>(
        `select indexname from pg_indexes where schemaname = 'public' order by indexname`,
      );
      const present = result.rows.map((row) => row.indexname);
      for (const name of [
        'attempts_session_idx',
        'lesson_sessions_profile_day_idx',
        'notifications_profile_read_idx',
        'review_items_profile_due_idx',
        'words_rule_family_week_idx',
      ]) {
        expect(present, `${name} was not created`).toContain(name);
      }
    });

    it('carries a comment on every index in the schema, naming its query', async () => {
      // The 03-database.md rule: an index exists only with the query it serves
      // named in a comment. This checks the live catalogue, so an index added
      // later without a comment fails here too.
      // Constraint-backed btrees are excluded: Postgres builds those to enforce
      // `unique (...)`, and they exist for correctness whether or not a query
      // reads them. The rule governs indexes added for performance — the ones
      // someone chose to create.
      const result = await db.query<{
        readonly indexname: string;
        readonly description: string | null;
      }>(`
        select c.relname as indexname, d.description
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          left join pg_description d on d.objoid = c.oid
          left join pg_constraint con on con.conindid = c.oid
         where c.relkind = 'i'
           and n.nspname = 'public'
           and con.oid is null
         order by c.relname
      `);
      expect(result.rows.length).toBeGreaterThan(0);
      for (const row of result.rows) {
        expect(row.description ?? '', `${row.indexname} has no comment`).toMatch(/select .* from /i);
      }
    });

    it('plans the due-review query with review_items_profile_due_idx', async () => {
      const plan = await planFor(
        `select id from public.review_items
          where profile_id = '${profileId}' and due_at <= now()
          order by due_at`,
      );
      expect(plan).toContain('review_items_profile_due_idx');
    });

    it('plans the session-attempts query with attempts_session_idx', async () => {
      const plan = await planFor(
        `select id from public.attempts where session_id = '${sessionId}'`,
      );
      expect(plan).toContain('attempts_session_idx');
    });

    it('plans the resume-a-day query with lesson_sessions_profile_day_idx', async () => {
      const plan = await planFor(
        `select id from public.lesson_sessions
          where profile_id = '${profileId}' and day_index = 7`,
      );
      expect(plan).toContain('lesson_sessions_profile_day_idx');
    });

    it('plans the unread-notifications query with notifications_profile_read_idx', async () => {
      const plan = await planFor(
        `select id from public.notifications
          where profile_id = '${profileId}' and read_at is null`,
      );
      expect(plan).toContain('notifications_profile_read_idx');
    });

    it('plans the content-selection query with words_rule_family_week_idx', async () => {
      const plan = await planFor(
        `select id from public.words
          where rule_family_id = '${ruleFamilyId}' and week_index = 2`,
      );
      expect(plan).toContain('words_rule_family_week_idx');
    });

    it('serves the exam-answer lookup from the unique constraint, with no second index', async () => {
      const result = await db.query<{ readonly indexname: string }>(
        `select indexname from pg_indexes
          where schemaname = 'public' and tablename = 'exam_answers'
            and indexdef like '%(question_id)%'`,
      );
      expect(result.rows.map((row) => row.indexname)).toEqual(['exam_answers_question_unique']);
    });
  });

  /**
   * F2.6 — the two-user proof `03-database.md` calls not optional and not
   * replaceable by a unit test. Everything above runs as the migration role,
   * which owns the tables and therefore bypasses RLS entirely. These tests are
   * the only ones that `set role authenticated` and are actually subject to the
   * policies, so this is the only place the policies are proved at all.
   */
  describe('008 RLS policies — the two-user proof', () => {
    interface ILearner {
      readonly userId: string;
      readonly profileId: string;
      readonly attemptId: string;
      readonly questionId: string;
    }

    let alice: ILearner;
    let bob: ILearner;

    /** One learner with a row in every table the proof covers. Written as owner, before any role switch. */
    async function seedLearner(email: string, name: string): Promise<ILearner> {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ($1) returning id`,
        [email],
      );
      const userId = user.rows[0]?.id ?? '';

      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name) values ($1, $2)
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [userId, name],
      );
      const profileId = profile.rows[0]?.id ?? '';

      const definition = await db.query<{ readonly id: string }>(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint)
         values ('diagnostic', 'RLS Fixture', 3600, 40, 70.00, 3, 24, 0, 0)
         on conflict (code) do update set title = excluded.title
         returning id`,
      );
      const definitionId = definition.rows[0]?.id ?? '';

      const session = await db.query<{ readonly id: string }>(
        `insert into public.lesson_sessions (profile_id, day_index) values ($1, 3) returning id`,
        [profileId],
      );
      const sessionId = session.rows[0]?.id ?? '';

      await db.query(
        `insert into public.attempts
           (session_id, profile_id, item_type, item_id, mode, submitted_value, is_correct, score)
         values ($1, $2, 'word', gen_random_uuid(), 'dictation', $3, true, 100)`,
        [sessionId, profileId, name],
      );

      await db.query(
        `insert into public.review_items (profile_id, item_id, item_type, due_at)
         values ($1, gen_random_uuid(), 'word', now())`,
        [profileId],
      );

      const attempt = await db.query<{ readonly id: string }>(
        `insert into public.exam_attempts
           (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
         values ($1, $2, 1, 'in_progress', now(), now() + interval '60 minutes', $3)
         returning id`,
        [profileId, definitionId, name],
      );
      const attemptId = attempt.rows[0]?.id ?? '';

      const question = await db.query<{ readonly id: string }>(
        `insert into public.exam_questions
           (attempt_id, section_code, order_index, type, payload, correct_answer)
         values ($1, 'dictation', 0, 'dictation', '{"prompt":"beautiful"}'::jsonb,
                 '{"answer":"beautiful"}'::jsonb)
         returning id`,
        [attemptId],
      );
      const questionId = question.rows[0]?.id ?? '';

      await db.query(
        `insert into public.exam_answers (question_id, attempt_id, profile_id, submitted_value)
         values ($1, $2, $3, $4)`,
        [questionId, attemptId, profileId, name],
      );

      await db.query(
        `insert into public.notifications (profile_id, type, title, body, scheduled_for)
         values ($1, 'daily_reminder', $2, 'Ten minutes.', now())`,
        [profileId, `${name} reminder`],
      );

      return { userId, profileId, attemptId, questionId };
    }

    beforeAll(async () => {
      alice = await seedLearner('alice-rls@example.com', 'Alice');
      bob = await seedLearner('bob-rls@example.com', 'Bob');
    }, 60_000);

    /**
     * Run something as a real client role. `authenticated` is not the table
     * owner, so RLS applies to it — the owner would bypass every policy and
     * prove nothing. Role and claims are always reset, or one leaked `set role`
     * would silently rewrite every test after it.
     */
    async function actingAs<T>(userId: string | null, run: () => Promise<T>): Promise<T> {
      await db.query(`select set_config('request.jwt.claims', $1, false)`, [
        userId === null ? '' : JSON.stringify({ sub: userId }),
      ]);
      await db.exec(`set role ${userId === null ? 'anon' : 'authenticated'};`);
      try {
        return await run();
      } finally {
        await db.exec(`reset role;`);
        await db.query(`select set_config('request.jwt.claims', '', false)`);
      }
    }

    async function countVisible(table: string, profileId: string): Promise<number> {
      const result = await db.query<{ readonly n: number }>(
        `select count(*)::int as n from public.${table} where profile_id = $1`,
        [profileId],
      );
      return result.rows[0]?.n ?? 0;
    }

    const OWNED_TABLES: readonly string[] = [
      'attempts',
      'review_items',
      'exam_attempts',
      'exam_answers',
      'notifications',
    ];

    it('seeded two distinct learners', () => {
      expect(alice.profileId).not.toBe('');
      expect(bob.profileId).not.toBe('');
      expect(alice.profileId).not.toBe(bob.profileId);
    });

    it('shows a learner their own rows', async () => {
      await actingAs(alice.userId, async () => {
        for (const table of OWNED_TABLES) {
          expect(await countVisible(table, alice.profileId), `alice cannot see her own ${table}`)
            .toBe(1);
        }
      });
    });

    it('hides user B\'s rows from user A, in every table the proof names', async () => {
      await actingAs(alice.userId, async () => {
        for (const table of OWNED_TABLES) {
          expect(await countVisible(table, bob.profileId), `alice can read bob's ${table}`).toBe(0);
        }
      });
    });

    it('hides user A\'s rows from user B, so the policy is not one-directional', async () => {
      await actingAs(bob.userId, async () => {
        for (const table of OWNED_TABLES) {
          expect(await countVisible(table, alice.profileId), `bob can read alice's ${table}`).toBe(0);
        }
      });
    });

    it('shows a learner only their own profile', async () => {
      await actingAs(alice.userId, async () => {
        const result = await db.query<{ readonly n: number }>(
          `select count(*)::int as n from public.learner_profiles`,
        );
        expect(result.rows[0]?.n).toBe(1);
      });
    });

    it('refuses to let a learner write a row owned by someone else', async () => {
      await actingAs(alice.userId, async () => {
        await expect(
          db.query(
            `insert into public.review_items (profile_id, item_id, item_type, due_at)
             values ($1, gen_random_uuid(), 'word', now())`,
            [bob.profileId],
          ),
        ).rejects.toThrow(/row-level security/i);
      });
    });

    it('refuses to let a learner hand their own row to someone else', async () => {
      // `using` alone would allow this: the row is visible, so the update is
      // permitted, and only `with check` stops the new value landing in B's set.
      await actingAs(alice.userId, async () => {
        await expect(
          db.query(`update public.review_items set profile_id = $1 where profile_id = $2`, [
            bob.profileId,
            alice.profileId,
          ]),
        ).rejects.toThrow(/row-level security/i);
      });
    });

    it('gives the client no delete on learner history at all', async () => {
      await actingAs(alice.userId, async () => {
        await expect(
          db.query(`delete from public.attempts where profile_id = $1`, [alice.profileId]),
        ).rejects.toThrow(/permission denied/i);
      });
    });

    it('refuses a learner the exam_questions table outright, answer key and all', async () => {
      // Stronger than an empty result: 008 grants the client nothing on this
      // table, so the request is refused at the privilege layer before RLS is
      // consulted. `03-database.md` asks for `correct_answer` to be unreachable,
      // and a table you cannot select from is unreachable in a way a
      // row-returning policy never quite is. F2.7 opens the safe subset as a
      // view; until then this is the whole story.
      await actingAs(alice.userId, async () => {
        await expect(
          db.query(`select count(*) from public.exam_questions`),
        ).rejects.toThrow(/permission denied/i);
        await expect(
          db.query(`select correct_answer from public.exam_questions where id = $1`, [
            alice.questionId,
          ]),
        ).rejects.toThrow(/permission denied/i);
      });
    });

    it('lets any authenticated learner read content, and write none of it', async () => {
      await actingAs(alice.userId, async () => {
        const read = await db.query<{ readonly n: number }>(
          `select count(*)::int as n from public.rule_families`,
        );
        expect(read.rows[0]?.n).toBeGreaterThan(0);

        await expect(
          db.query(
            `insert into public.rule_families (code, statement, examples, counterexamples)
             values ('HACKED', 'x', array['a','b','c'], array['d','e'])`,
          ),
        ).rejects.toThrow(/permission denied/i);
      });
    });

    it('shows an anonymous caller no learner data whatsoever', async () => {
      await actingAs(null, async () => {
        for (const table of OWNED_TABLES) {
          await expect(
            db.query(`select count(*) from public.${table}`),
            `anon can reach ${table}`,
          ).rejects.toThrow(/permission denied/i);
        }
      });
    });

    it('verifies a certificate publicly without leaking the learner behind it', async () => {
      const certificate = await db.query<{ readonly verification_code: string }>(
        `insert into public.certificates
           (profile_id, exam_attempt_id, verification_code, learner_name, track, score_percent, comparison)
         values ($1, $2, 'PUBL-ICVE-RIFY', 'Alice', 'standard28', 88.00, '{"day1": 40}'::jsonb)
         returning verification_code`,
        [alice.profileId, alice.attemptId],
      );
      const code = certificate.rows[0]?.verification_code ?? '';

      await actingAs(null, async () => {
        const view = await db.query<Record<string, unknown>>(
          `select * from public.certificate_verifications where verification_code = $1`,
          [code],
        );
        expect(view.rows.length).toBe(1);

        const columns = Object.keys(view.rows[0] ?? {});
        expect(columns, 'the public view leaks the owner').not.toContain('profile_id');
        expect(columns, 'the public view leaks progress history').not.toContain('comparison');
        expect(columns).toContain('revoked_at');

        // The view is the only public door; the table behind it stays shut.
        await expect(db.query(`select count(*) from public.certificates`)).rejects.toThrow(
          /permission denied/i,
        );
      });
    });
  });

  /**
   * F2.7 — `correct_answer` protection.
   *
   * `03-database.md` offers two mechanisms: a column-level policy, or a view
   * that excludes the column. 008 took a third and stricter route by accident
   * of doing its job properly — it grants the client nothing on the table at
   * all — so the column is refused at the privilege layer, before RLS or any
   * column list is consulted. There is nothing left to build; there is a great
   * deal left to prove, and to keep proved.
   *
   * These tests are the lock. The exposure they guard against is not today's
   * schema, it is the migration six phases from now that grants `select` on
   * `exam_questions` to make some screen work.
   */
  describe('F2.7 correct_answer protection', () => {
    let learner: { readonly userId: string; readonly questionId: string };

    beforeAll(async () => {
      const user = await db.query<{ readonly id: string }>(
        `insert into auth.users (email) values ('answerkey@example.com') returning id`,
      );
      const userId = user.rows[0]?.id ?? '';
      const profile = await db.query<{ readonly id: string }>(
        `insert into public.learner_profiles (user_id, display_name)
         values ($1, 'Answer Key')
         on conflict (user_id) do update set display_name = excluded.display_name
         returning id`,
        [userId],
      );
      const definition = await db.query<{ readonly id: string }>(
        `insert into public.exam_definitions
           (code, title, duration_seconds, question_count, pass_percent, max_attempts,
            cooldown_hours, unlock_day_standard, unlock_day_sprint)
         values ('final', 'Answer Key Fixture', 3600, 40, 70.00, 3, 24, 28, 21)
         on conflict (code) do update set title = excluded.title
         returning id`,
      );
      const attempt = await db.query<{ readonly id: string }>(
        `insert into public.exam_attempts
           (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
         values ($1, $2, 1, 'in_progress', now(), now() + interval '60 minutes', 'answerkey')
         returning id`,
        [profile.rows[0]?.id, definition.rows[0]?.id],
      );
      const question = await db.query<{ readonly id: string }>(
        `insert into public.exam_questions
           (attempt_id, section_code, order_index, type, payload, correct_answer)
         values ($1, 'dictation', 0, 'dictation', '{"prompt":"necessary"}'::jsonb,
                 '{"answer":"necessary"}'::jsonb)
         returning id`,
        [attempt.rows[0]?.id],
      );
      learner = { userId, questionId: question.rows[0]?.id ?? '' };
    }, 60_000);

    async function asRole<T>(role: 'anon' | 'authenticated', userId: string | null, run: () => Promise<T>): Promise<T> {
      await db.query(`select set_config('request.jwt.claims', $1, false)`, [
        userId === null ? '' : JSON.stringify({ sub: userId }),
      ]);
      await db.exec(`set role ${role};`);
      try {
        return await run();
      } finally {
        await db.exec(`reset role;`);
        await db.query(`select set_config('request.jwt.claims', '', false)`);
      }
    }

    it('denies an authenticated learner the correct_answer column', async () => {
      await asRole('authenticated', learner.userId, async () => {
        await expect(
          db.query(`select correct_answer from public.exam_questions where id = $1`, [
            learner.questionId,
          ]),
        ).rejects.toThrow(/permission denied/i);
      });
    });

    it('denies an anonymous caller the same column', async () => {
      await asRole('anon', null, async () => {
        await expect(
          db.query(`select correct_answer from public.exam_questions`),
        ).rejects.toThrow(/permission denied/i);
      });
    });

    it('grants no client role any privilege on correct_answer, by any route', async () => {
      // The crisp regression lock: a future `grant select on exam_questions to
      // authenticated`, or a column-level grant naming this column, flips one of
      // these to true and fails here.
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['select', 'insert', 'update', 'references']) {
          const result = await db.query<{ readonly allowed: boolean }>(
            `select has_column_privilege($1, 'public.exam_questions', 'correct_answer', $2) as allowed`,
            [role, privilege],
          );
          expect(
            result.rows[0]?.allowed,
            `${role} has ${privilege} on exam_questions.correct_answer`,
          ).toBe(false);
        }
      }
    });

    it('grants no client role any privilege on any other column of the table either', async () => {
      // correct_answer is the prize, but a learner who can read `payload` for
      // an attempt that is not theirs has still read an unreleased exam.
      const columns = await db.query<{ readonly column_name: string }>(
        `select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'exam_questions'`,
      );
      expect(columns.rows.length).toBeGreaterThan(0);
      for (const { column_name } of columns.rows) {
        for (const role of ['anon', 'authenticated']) {
          const result = await db.query<{ readonly allowed: boolean }>(
            `select has_column_privilege($1, 'public.exam_questions', $2, 'select') as allowed`,
            [role, column_name],
          );
          expect(result.rows[0]?.allowed, `${role} can select ${column_name}`).toBe(false);
        }
      }
    });

    it('exposes correct_answer through no view in the schema', async () => {
      // A view runs as its owner and bypasses the table's privileges, so a view
      // selecting this column would undo everything above. Today the only
      // relation carrying the name is the base table itself.
      const result = await db.query<{ readonly table_name: string }>(
        `select c.table_name
           from information_schema.columns c
           join information_schema.views v
             on v.table_schema = c.table_schema and v.table_name = c.table_name
          where c.table_schema = 'public' and c.column_name = 'correct_answer'`,
      );
      expect(result.rows.map((row) => row.table_name), 'a view exposes correct_answer').toEqual([]);
    });

    it('keeps the column readable by the owner, so the grader can still grade', async () => {
      // Protection that also blocked the service role would be a broken exam,
      // not a secure one. The API reads this table as the service role.
      const result = await db.query<{ readonly correct_answer: unknown }>(
        `select correct_answer from public.exam_questions where id = $1`,
        [learner.questionId],
      );
      expect(result.rows[0]?.correct_answer).toEqual({ answer: 'necessary' });
    });
  });

  /** F2.8 — the four pieces of behaviour 009 puts in the database. */
  describe('009 functions and triggers', () => {
    describe('a new auth.users row becomes a learner', () => {
      it('creates the learner_profiles row, which is the feature test', async () => {
        const user = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values ('signup@example.com') returning id`,
        );
        const userId = user.rows[0]?.id ?? '';

        const profile = await db.query<{ readonly display_name: string }>(
          `select display_name from public.learner_profiles where user_id = $1`,
          [userId],
        );
        expect(profile.rows.length, 'no profile was created for the new user').toBe(1);
      });

      it('takes the display name from the Google profile when it is there', async () => {
        const user = await db.query<{ readonly id: string }>(
          `insert into auth.users (email, raw_user_meta_data)
           values ('named@example.com', '{"full_name":"Roni Sarkar"}'::jsonb) returning id`,
        );
        const profile = await db.query<{ readonly display_name: string }>(
          `select display_name from public.learner_profiles where user_id = $1`,
          [user.rows[0]?.id],
        );
        expect(profile.rows[0]?.display_name).toBe('Roni Sarkar');
      });

      it('falls back to the email local part, then to a placeholder, never to blank', async () => {
        // display_name is not null with a non-blank check, so a signup that
        // could not resolve a name would fail the signup itself.
        const withEmail = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values ('fallback@example.com') returning id`,
        );
        const first = await db.query<{ readonly display_name: string }>(
          `select display_name from public.learner_profiles where user_id = $1`,
          [withEmail.rows[0]?.id],
        );
        expect(first.rows[0]?.display_name).toBe('fallback');

        const withNothing = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values (null) returning id`,
        );
        const second = await db.query<{ readonly display_name: string }>(
          `select display_name from public.learner_profiles where user_id = $1`,
          [withNothing.rows[0]?.id],
        );
        expect(second.rows[0]?.display_name).toBe('Learner');
      });

      it('is idempotent, so BootstrapProfileUseCase can run on top of it', async () => {
        const user = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values ('signup-idempotent@example.com') returning id`,
        );
        const userId = user.rows[0]?.id ?? '';

        // What the use case does: insert, expecting the trigger may have won.
        await db.query(
          `insert into public.learner_profiles (user_id, display_name)
           values ($1, 'Bootstrapped') on conflict (user_id) do nothing`,
          [userId],
        );
        const count = await db.query<{ readonly n: number }>(
          `select count(*)::int as n from public.learner_profiles where user_id = $1`,
          [userId],
        );
        expect(count.rows[0]?.n).toBe(1);
      });
    });

    describe('updated_at', () => {
      it('is stamped by the trigger, overriding whatever the writer claimed', async () => {
        const user = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values ('touch@example.com') returning id`,
        );
        const profileId = (
          await db.query<{ readonly id: string }>(
            `select id from public.learner_profiles where user_id = $1`,
            [user.rows[0]?.id],
          )
        ).rows[0]?.id;

        // A writer setting updated_at by hand is the case that matters: the
        // trigger has to win, or the column records whatever the caller felt like.
        const updated = await db.query<{ readonly updated_at: string }>(
          `update public.learner_profiles
              set display_name = 'Touched', updated_at = timestamptz '2020-01-01 00:00:00+00'
            where id = $1
            returning updated_at`,
          [profileId],
        );
        expect(new Date(updated.rows[0]?.updated_at ?? 0).getUTCFullYear()).toBeGreaterThan(2020);
      });

      it('is attached to every table that has the column', async () => {
        const missing = await db.query<{ readonly table_name: string }>(
          `select c.table_name
             from information_schema.columns c
             join information_schema.tables t
               on t.table_schema = c.table_schema and t.table_name = c.table_name
            where c.table_schema = 'public'
              and c.column_name = 'updated_at'
              and t.table_type = 'BASE TABLE'
              and not exists (
                select 1 from pg_trigger tr
                  join pg_class cl on cl.oid = tr.tgrelid
                  join pg_namespace n on n.oid = cl.relnamespace
                 where n.nspname = 'public'
                   and cl.relname = c.table_name
                   and not tr.tgisinternal
              )`,
        );
        expect(missing.rows.map((row) => row.table_name), 'tables with no updated_at trigger')
          .toEqual([]);
      });
    });

    describe('complete_lesson_session', () => {
      async function sessionFor(email: string): Promise<{
        readonly profileId: string;
        readonly sessionId: string;
      }> {
        const user = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values ($1) returning id`,
          [email],
        );
        const profile = await db.query<{ readonly id: string }>(
          `select id from public.learner_profiles where user_id = $1`,
          [user.rows[0]?.id],
        );
        const profileId = profile.rows[0]?.id ?? '';
        const session = await db.query<{ readonly id: string }>(
          `insert into public.lesson_sessions (profile_id, day_index) values ($1, 5) returning id`,
          [profileId],
        );
        return { profileId, sessionId: session.rows[0]?.id ?? '' };
      }

      const ITEM = '11111111-1111-4111-8111-111111111111';

      it('writes all four tables and closes the session in one call', async () => {
        const { profileId, sessionId } = await sessionFor('complete@example.com');

        const written = await db.query<{ readonly complete_lesson_session: number }>(
          `select public.complete_lesson_session(
             $1, 2, 1,
             $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb
           )`,
          [
            sessionId,
            JSON.stringify([
              {
                item_type: 'word',
                item_id: ITEM,
                mode: 'dictation',
                submitted_value: 'beautifull',
                is_correct: false,
                score: 40,
                error_tags: ['DOUBLE_CONSONANT'],
                latency_ms: 3200,
              },
              {
                item_type: 'word',
                item_id: ITEM,
                mode: 'pronunciation',
                submitted_value: 'beautiful',
                is_correct: true,
                score: 91,
                error_tags: [],
                latency_ms: 1800,
              },
            ]),
            JSON.stringify([
              {
                item_id: ITEM,
                item_type: 'word',
                interval_index: 1,
                due_at: '2026-08-19T06:00:00Z',
                times_seen: 2,
                times_correct: 1,
                consecutive_correct: 1,
                last_correct_on: '2026-08-18',
                is_mastered: false,
                last_error_tags: ['DOUBLE_CONSONANT'],
              },
            ]),
            JSON.stringify([
              {
                dimension: 'rule_family',
                dimension_id: ITEM,
                attempts: 2,
                correct: 1,
                accuracy: 50.0,
              },
            ]),
            JSON.stringify({
              current_streak: 3,
              longest_streak: 7,
              last_active_date: '2026-08-18',
              freezes_remaining: 1,
            }),
          ],
        );
        expect(written.rows[0]?.complete_lesson_session, 'attempts written').toBe(2);

        const attempts = await db.query<{ readonly n: number }>(
          `select count(*)::int as n from public.attempts where session_id = $1`,
          [sessionId],
        );
        expect(attempts.rows[0]?.n).toBe(2);

        const review = await db.query<{ readonly interval_index: number; readonly due_at: string }>(
          `select interval_index, due_at from public.review_items
            where profile_id = $1 and item_id = $2`,
          [profileId, ITEM],
        );
        expect(review.rows[0]?.interval_index, 'the ladder position the domain decided').toBe(1);

        const mastery = await db.query<{ readonly accuracy: string }>(
          `select accuracy from public.mastery_records where profile_id = $1`,
          [profileId],
        );
        expect(Number(mastery.rows[0]?.accuracy)).toBe(50);

        const streak = await db.query<{ readonly current_streak: number }>(
          `select current_streak from public.streak_records where profile_id = $1`,
          [profileId],
        );
        expect(streak.rows[0]?.current_streak).toBe(3);

        const session = await db.query<{
          readonly completed_at: string | null;
          readonly items_correct: number;
        }>(`select completed_at, items_correct from public.lesson_sessions where id = $1`, [
          sessionId,
        ]);
        expect(session.rows[0]?.completed_at).not.toBeNull();
        expect(session.rows[0]?.items_correct).toBe(1);
      });

      it('updates the ladder on a second pass instead of forking the review item', async () => {
        const { profileId, sessionId } = await sessionFor('secondpass@example.com');
        const call = (intervalIndex: number): Promise<unknown> =>
          db.query(
            `select public.complete_lesson_session($1, 1, 1, '[]'::jsonb, $2::jsonb, '[]'::jsonb, null)`,
            [
              sessionId,
              JSON.stringify([
                {
                  item_id: ITEM,
                  item_type: 'word',
                  interval_index: intervalIndex,
                  due_at: '2026-08-20T06:00:00Z',
                  times_seen: intervalIndex + 1,
                  times_correct: intervalIndex + 1,
                  consecutive_correct: intervalIndex + 1,
                  last_correct_on: '2026-08-18',
                  is_mastered: false,
                  last_error_tags: [],
                },
              ]),
            ],
          );

        await call(1);
        await call(2);

        const rows = await db.query<{ readonly n: number; readonly interval_index: number }>(
          `select count(*)::int as n, max(interval_index) as interval_index
             from public.review_items where profile_id = $1 and item_id = $2`,
          [profileId, ITEM],
        );
        expect(rows.rows[0]?.n, 'the review item forked').toBe(1);
        expect(rows.rows[0]?.interval_index).toBe(2);
      });

      it('writes nothing at all when any part of the payload is bad', async () => {
        // The whole reason this is one function: a learner whose streak advanced
        // but whose review items did not is corruption nobody notices until the
        // spaced repetition stops making sense.
        const { profileId, sessionId } = await sessionFor('atomic@example.com');

        await expect(
          db.query(
            `select public.complete_lesson_session($1, 1, 1, $2::jsonb, '[]'::jsonb, '[]'::jsonb, $3::jsonb)`,
            [
              sessionId,
              JSON.stringify([
                {
                  item_type: 'word',
                  item_id: ITEM,
                  mode: 'telepathy',
                  submitted_value: 'x',
                  is_correct: true,
                  score: 100,
                  error_tags: [],
                },
              ]),
              JSON.stringify({
                current_streak: 9,
                longest_streak: 9,
                last_active_date: '2026-08-18',
                freezes_remaining: 0,
              }),
            ],
          ),
        ).rejects.toThrow(/attempts_mode_check/);

        const streak = await db.query<{ readonly n: number }>(
          `select count(*)::int as n from public.streak_records where profile_id = $1`,
          [profileId],
        );
        expect(streak.rows[0]?.n, 'the streak survived a rolled-back call').toBe(0);

        const session = await db.query<{ readonly completed_at: string | null }>(
          `select completed_at from public.lesson_sessions where id = $1`,
          [sessionId],
        );
        expect(session.rows[0]?.completed_at, 'the session was closed anyway').toBeNull();
      });

      it('refuses a session that does not exist rather than writing orphans', async () => {
        await expect(
          db.query(
            `select public.complete_lesson_session($1, 0, 0, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, null)`,
            ['22222222-2222-4222-8222-222222222222'],
          ),
        ).rejects.toThrow(/does not exist/);
      });

      it('files every row under the session\'s own learner, whatever the payload says', async () => {
        // profile_id is never read from the payload — it is resolved from the
        // session — so a caller cannot write into someone else's history.
        const mine = await sessionFor('mine@example.com');
        const theirs = await sessionFor('theirs@example.com');

        await db.query(
          `select public.complete_lesson_session($1, 1, 1, $2::jsonb, '[]'::jsonb, '[]'::jsonb, null)`,
          [
            mine.sessionId,
            JSON.stringify([
              {
                profile_id: theirs.profileId,
                item_type: 'word',
                item_id: ITEM,
                mode: 'dictation',
                submitted_value: 'x',
                is_correct: true,
                score: 100,
                error_tags: [],
              },
            ]),
          ],
        );

        const landed = await db.query<{ readonly profile_id: string }>(
          `select profile_id from public.attempts where session_id = $1`,
          [mine.sessionId],
        );
        expect(landed.rows[0]?.profile_id).toBe(mine.profileId);
        expect(landed.rows[0]?.profile_id).not.toBe(theirs.profileId);
      });
    });

    describe('exam auto-submit', () => {
      async function attempt(email: string, deadline: string): Promise<string> {
        const user = await db.query<{ readonly id: string }>(
          `insert into auth.users (email) values ($1) returning id`,
          [email],
        );
        const profile = await db.query<{ readonly id: string }>(
          `select id from public.learner_profiles where user_id = $1`,
          [user.rows[0]?.id],
        );
        const definition = await db.query<{ readonly id: string }>(
          `insert into public.exam_definitions
             (code, title, duration_seconds, question_count, pass_percent, max_attempts,
              cooldown_hours, unlock_day_standard, unlock_day_sprint)
           values ('milestone1', 'Autosubmit Fixture', 3600, 40, 70.00, 3, 24, 7, 5)
           on conflict (code) do update set title = excluded.title
           returning id`,
        );
        const row = await db.query<{ readonly id: string }>(
          `insert into public.exam_attempts
             (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
           values ($1, $2, 1, 'in_progress', now() - interval '2 hours', ${deadline}, $3)
           returning id`,
          [profile.rows[0]?.id, definition.rows[0]?.id, email],
        );
        return row.rows[0]?.id ?? '';
      }

      it('submits an attempt abandoned past its deadline, and grades nothing', async () => {
        const expired = await attempt('expired@example.com', `now() - interval '1 hour'`);
        const moved = await db.query<{ readonly autosubmit_expired_exam_attempts: number }>(
          `select public.autosubmit_expired_exam_attempts()`,
        );
        expect(moved.rows[0]?.autosubmit_expired_exam_attempts).toBeGreaterThanOrEqual(1);

        const row = await db.query<{
          readonly status: string;
          readonly submitted_at: string | null;
          readonly score_percent: string | null;
          readonly passed: boolean | null;
        }>(
          `select status, submitted_at, score_percent, passed
             from public.exam_attempts where id = $1`,
          [expired],
        );
        expect(row.rows[0]?.status).toBe('submitted');
        expect(row.rows[0]?.submitted_at).not.toBeNull();
        // The deadline passing is not a grade. The exam engine scores it.
        expect(row.rows[0]?.score_percent).toBeNull();
        expect(row.rows[0]?.passed).toBeNull();
      });

      it('leaves a live attempt alone', async () => {
        const live = await attempt('live@example.com', `now() + interval '30 minutes'`);
        await db.query(`select public.autosubmit_expired_exam_attempts()`);
        const row = await db.query<{ readonly status: string }>(
          `select status from public.exam_attempts where id = $1`,
          [live],
        );
        expect(row.rows[0]?.status).toBe('in_progress');
      });

      it('frees the slot, which is the whole point', async () => {
        // The partial unique index allows one in_progress attempt per exam. An
        // abandoned one would block every retake forever.
        const blocked = await attempt('blocked@example.com', `now() - interval '5 minutes'`);
        const owner = await db.query<{ readonly profile_id: string; readonly definition_id: string }>(
          `select profile_id, definition_id from public.exam_attempts where id = $1`,
          [blocked],
        );
        await db.query(`select public.autosubmit_expired_exam_attempts()`);
        await db.query(
          `insert into public.exam_attempts
             (profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, seed)
           values ($1, $2, 2, 'in_progress', now(), now() + interval '60 minutes', 'retake')`,
          [owner.rows[0]?.profile_id, owner.rows[0]?.definition_id],
        );
      });
    });

    describe('none of these functions belong to the client', () => {
      it('refuses every client role execute, which the default grant would have given', async () => {
        // Postgres grants execute to PUBLIC on a new function, so 008's revoke
        // sweep does not reach anything created in 009. Without the explicit
        // revokes, an anon visitor could complete a lesson for any session id.
        for (const role of ['anon', 'authenticated']) {
          for (const fn of [
            'public.complete_lesson_session(uuid, integer, integer, jsonb, jsonb, jsonb, jsonb)',
            'public.autosubmit_expired_exam_attempts()',
            'public.handle_new_user()',
            'public.set_updated_at()',
          ]) {
            const result = await db.query<{ readonly allowed: boolean }>(
              `select has_function_privilege($1, $2, 'execute') as allowed`,
              [role, fn],
            );
            expect(result.rows[0]?.allowed, `${role} can execute ${fn}`).toBe(false);
          }
        }
      });
    });
  });

  describe('010 seed reference', () => {
    /**
     * The counts are asserted by the migration itself, so a wrong count fails
     * `pnpm db:migrate` before it fails here. These tests exist for the half of
     * F2.9 a count cannot see: that the rows say something true about Bangla and
     * about English, rather than filling the column so the constraint passes.
     */

    /** Bangla script, U+0980..U+09FF. A transliteration would pass a not-null check. */
    const BANGLA_ONLY = /^[ঀ-৿‌‍]+$/u;

    /** The shapes a placeholder takes when someone means to come back to it. */
    const PLACEHOLDER = /\b(tbd|todo|fixme|placeholder|lorem|ipsum|n\/a|xxx+|\?\?\?)\b/i;

    interface IPhonemeRow {
      readonly symbol: string;
      readonly type: string;
      readonly bangla_equivalent: string | null;
      readonly articulation_note: string;
      readonly common_bengali_substitution: string | null;
    }

    interface IRuleFamilyRow {
      readonly code: string;
      readonly statement: string;
      readonly examples: readonly string[];
      readonly counterexamples: readonly string[];
    }

    /**
     * Its own database, not the shared one. The suites above insert content
     * fixtures — a `/v/` phoneme, a run of `IDX_RF_%` rule families — into `db`
     * to exercise constraints and index plans, and a seed assertion counted
     * against those would be measuring the fixtures. This applies every
     * migration to an empty instance and asks what 010 alone produced.
     */
    let seedDb: PGlite;
    let phonemes: readonly IPhonemeRow[] = [];
    let ruleFamilies: readonly IRuleFamilyRow[] = [];

    beforeAll(async () => {
      seedDb = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
      await seedDb.exec(AUTH_SHIM);
      await applyAll(seedDb);
      const phonemeResult = await seedDb.query<IPhonemeRow>(
        `select symbol, type, bangla_equivalent, articulation_note, common_bengali_substitution
           from public.phonemes order by symbol`,
      );
      phonemes = phonemeResult.rows;
      const ruleResult = await seedDb.query<IRuleFamilyRow>(
        `select code, statement, examples, counterexamples
           from public.rule_families order by code`,
      );
      ruleFamilies = ruleResult.rows;
    }, 60_000);

    it('seeds exactly 44 phonemes and 24 rule families', () => {
      expect(phonemes.length).toBe(44);
      expect(ruleFamilies.length).toBe(24);
    });

    it('splits the 44 into 12 vowels, 8 diphthongs and 24 consonants', () => {
      const count = (type: string): number =>
        phonemes.filter((phoneme) => phoneme.type === type).length;
      expect({
        vowel: count('vowel'),
        diphthong: count('diphthong'),
        consonant: count('consonant'),
      }).toEqual({ vowel: 12, diphthong: 8, consonant: 24 });
    });

    it('gives every phoneme a distinct IPA symbol', () => {
      const symbols = phonemes.map((phoneme) => phoneme.symbol);
      expect(new Set(symbols).size).toBe(symbols.length);
      for (const symbol of symbols) {
        expect(symbol.trim(), 'a symbol is blank').not.toBe('');
        expect(symbol, `${symbol} carries slash delimiters`).not.toMatch(/\//);
      }
    });

    it('writes the Bangla equivalent in Bangla script, never transliterated', () => {
      // CLAUDE.md §10. A latin-letter "sh" in this column would render as
      // nonsense next to the Bangla UI and teach the wrong grapheme.
      for (const phoneme of phonemes) {
        if (phoneme.bangla_equivalent === null) continue;
        expect(
          phoneme.bangla_equivalent,
          `${phoneme.symbol} has a non-Bangla equivalent: ${phoneme.bangla_equivalent}`,
        ).toMatch(BANGLA_ONLY);
      }
    });

    it('says what a learner produces instead wherever Bangla lacks the sound', () => {
      // A null equivalent with a null substitution is a hole, not a fact: the
      // Phase 6 scorer would have nothing to say about the commonest errors.
      const silent = phonemes.filter(
        (phoneme) =>
          phoneme.bangla_equivalent === null && phoneme.common_bengali_substitution === null,
      );
      expect(silent.map((phoneme) => phoneme.symbol)).toEqual([]);
    });

    it('covers the sounds Bangla does not have', () => {
      // The five that cost a Bengali speaker the most marks. Each must be
      // recorded as absent, not quietly mapped onto a near-enough letter.
      const absent = new Set(
        phonemes
          .filter((phoneme) => phoneme.bangla_equivalent === null)
          .map((phoneme) => phoneme.symbol),
      );
      for (const symbol of ['v', 'z', 'θ', 'ð', 'w']) {
        expect(absent.has(symbol), `${symbol} is marked as having a Bangla equivalent`).toBe(true);
      }
    });

    it('writes an articulation note for every phoneme, not a stub', () => {
      for (const phoneme of phonemes) {
        expect(
          phoneme.articulation_note.length,
          `${phoneme.symbol} has a stub articulation note`,
        ).toBeGreaterThan(24);
      }
    });

    it('holds every rule family to three examples and two counterexamples', () => {
      for (const family of ruleFamilies) {
        expect(family.examples.length, `${family.code} has the wrong example count`).toBe(3);
        expect(
          family.counterexamples.length,
          `${family.code} has the wrong counterexample count`,
        ).toBe(2);
      }
    });

    it('never repeats an example as its own counterexample', () => {
      // The cheapest way to satisfy `cardinality(...) = 2` is to copy a row up.
      // A rule whose counterexample is one of its examples teaches nothing.
      for (const family of ruleFamilies) {
        const shared = family.counterexamples.filter((item) => family.examples.includes(item));
        expect(shared, `${family.code} reuses an example as a counterexample`).toEqual([]);
      }
    });

    it('gives every rule family a snake_case code and a full statement', () => {
      const codes = ruleFamilies.map((family) => family.code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const family of ruleFamilies) {
        expect(family.code, `${family.code} is not snake_case`).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(family.statement.length, `${family.code} has a stub statement`).toBeGreaterThan(30);
        expect(family.statement, `${family.code} does not end in a full stop`).toMatch(/\.$/);
      }
    });

    it('contains no placeholder text in any seeded column', () => {
      const offending: string[] = [];
      for (const phoneme of phonemes) {
        for (const value of [
          phoneme.symbol,
          phoneme.bangla_equivalent,
          phoneme.articulation_note,
          phoneme.common_bengali_substitution,
        ]) {
          if (value !== null && PLACEHOLDER.test(value)) offending.push(`${phoneme.symbol}: ${value}`);
        }
      }
      for (const family of ruleFamilies) {
        for (const value of [family.statement, ...family.examples, ...family.counterexamples]) {
          if (PLACEHOLDER.test(value)) offending.push(`${family.code}: ${value}`);
        }
      }
      expect(offending).toEqual([]);
    });

    it('refuses to apply when a seeded row is missing', async () => {
      /**
       * The guard is the whole point of the feature: 44 and 24 are quoted
       * across the design docs and Phase 6 turns each phoneme into a scoring
       * dimension, so a row lost to a bad merge has to stop the deploy.
       *
       * It is also the check most easily written as dead code. The first draft
       * aliased only the table — `unnest(expected_symbols) as symbol` — so the
       * bare `symbol` in the subquery bound to `p.symbol`, the condition read
       * `p.symbol = p.symbol`, and every missing row passed. Nothing static
       * catches that; applying a deliberately broken seed does.
       */
      const applyBrokenSeed = async (breakIt: (sql: string) => string): Promise<unknown> => {
        const scratch = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
        await scratch.exec(AUTH_SHIM);
        for (const name of migrations) {
          const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
          await scratch.exec(name === '010_seed_reference.sql' ? breakIt(sql) : sql);
        }
        await scratch.close();
        return undefined;
      };

      const withoutTheta = (sql: string): string => {
        const next = sql.replace(
          /^ {2}\('θ', 'consonant', null,\n(?: {3}.*\n)*? {3}'[^']*'\),\n/m,
          '',
        );
        expect(next, 'the phoneme row was not removed, so the test proves nothing').not.toBe(sql);
        return next;
      };
      const withoutFewerLess = (sql: string): string => {
        const next = sql.replace(/^ {2}\('fewer_less',\n(?: {3}.*\n)*? {3}.*\]\),\n\n/m, '');
        expect(next, 'the rule family row was not removed, so the test proves nothing').not.toBe(
          sql,
        );
        return next;
      };

      await expect(applyBrokenSeed(withoutTheta)).rejects.toThrow(/phonemes absent after seeding/);
      await expect(applyBrokenSeed(withoutFewerLess)).rejects.toThrow(
        /rule families absent after seeding/,
      );
    }, 60_000);

    it('re-applies without duplicating a row or drifting a count', async () => {
      // The seed is keyed on `symbol` and `code`, not guarded by `if not
      // exists`, so re-running is the only way to prove the conflict targets
      // are the natural keys and not something that happens to be unique today.
      await seedDb.exec(readFileSync(join(MIGRATIONS_DIR, '010_seed_reference.sql'), 'utf8'));
      const after = await seedDb.query<{ readonly phonemes: string; readonly families: string }>(
        `select (select count(*)::text from public.phonemes)      as phonemes,
                (select count(*)::text from public.rule_families) as families`,
      );
      expect(after.rows[0]).toEqual({ phonemes: '44', families: '24' });
    });
  });
});
