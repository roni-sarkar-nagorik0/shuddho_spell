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
    id     uuid primary key default gen_random_uuid(),
    email  text unique
  );
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
  'exam_answers',
  'exam_attempts',
  'lesson_sessions',
  'mastery_records',
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
    await applyAll(db);
    const result = await db.query<{ readonly count: string }>(
      `select count(*)::text as count from public.phonemes`,
    );
    expect(result.rows[0]?.count, 'a re-run dropped or duplicated data').toBe('1');
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
         values ($1, 'Cascade Test') returning id`,
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
         values ($1, 'Tag Test') returning id`,
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
         values ($1, 'Review Test') returning id`,
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
         values ($1, 'Ladder Test') returning id`,
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
         values ($1, 'Exam Test') returning id`,
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
});
