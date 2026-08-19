import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The migrations are plain SQL applied by `pnpm db:migrate` against a hosted
 * Supabase project. That command needs a real database, so it cannot run here;
 * these tests guard the conventions in `03-database.md` that a reviewer would
 * otherwise have to check by eye on every migration for the rest of the build.
 */

const MIGRATIONS_DIR = 'supabase/migrations';

interface IMigrationFile {
  readonly name: string;
  readonly version: string;
  readonly sql: string;
}

interface ITableBlock {
  readonly table: string;
  readonly body: string;
}

const files: readonly IMigrationFile[] = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => ({
    name,
    version: name.slice(0, 3),
    sql: readFileSync(join(MIGRATIONS_DIR, name), 'utf8'),
  }));

/** Comments explain what the SQL does not do, so a contract check must not read them. */
function withoutComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function tableBlocks(sql: string): readonly ITableBlock[] {
  const pattern = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  const blocks: ITableBlock[] = [];
  for (const match of sql.matchAll(pattern)) {
    const table = match[1];
    const body = match[2];
    if (table !== undefined && body !== undefined) blocks.push({ table, body });
  }
  return blocks;
}

const allTables: readonly ITableBlock[] = files.flatMap((file) => tableBlocks(file.sql));

describe('migration files', () => {
  it('are numbered, ordered and uniquely versioned', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file.name, `${file.name} is not NNN_snake_case.sql`).toMatch(/^\d{3}_[a-z0-9_]+\.sql$/);
    }
    const versions = files.map((file) => file.version);
    expect(new Set(versions).size, 'two migrations share a number').toBe(versions.length);
  });

  it('are idempotent — every create is guarded by if not exists', () => {
    for (const file of files) {
      const unguarded = file.sql
        .split('\n')
        .filter((line) => /^\s*create (table|extension|index|unique index)\b/i.test(line))
        .filter((line) => !/if not exists/i.test(line));
      expect(unguarded, `${file.name} has an unguarded create`).toEqual([]);
    }
  });

  it('001 installs the extensions the schema depends on', () => {
    const extensions = files.find((file) => file.version === '001');
    expect(extensions).toBeDefined();
    const sql = extensions === undefined ? '' : extensions.sql;
    expect(sql).toMatch(/create extension if not exists "pgcrypto"/);
    expect(sql).toMatch(/create extension if not exists "uuid-ossp"/);
    expect(sql).toMatch(/create extension if not exists pg_cron/);
  });
});

describe('table conventions (03-database.md)', () => {
  it('gives every table id, created_at and updated_at', () => {
    expect(allTables.length).toBeGreaterThan(0);
    for (const { table, body } of allTables) {
      expect(body, `${table} is missing the uuid primary key`).toMatch(
        /\bid\s+uuid\s+primary key default gen_random_uuid\(\)/,
      );
      expect(body, `${table} is missing created_at`).toMatch(
        /\bcreated_at\s+timestamptz not null default now\(\)/,
      );
      expect(body, `${table} is missing updated_at`).toMatch(
        /\bupdated_at\s+timestamptz not null default now\(\)/,
      );
    }
  });

  it('never uses an inexact numeric type or a naive timestamp', () => {
    for (const file of files) {
      const offending = withoutComments(file.sql)
        .split('\n')
        .filter((line) => /\b(float|float4|float8|double precision|real|money)\b/i.test(line)
          || /\btimestamp\b(?!tz)/i.test(line));
      expect(offending, `${file.name} uses an inexact or naive type`).toEqual([]);
    }
  });

  it('uses text plus a check constraint instead of a Postgres enum', () => {
    for (const file of files) {
      expect(file.sql, `${file.name} declares a Postgres enum`).not.toMatch(/create type .* as enum/i);
    }
  });
});

describe('002 content tables', () => {
  const content = files.find((file) => file.version === '002');
  const sql = content === undefined ? '' : content.sql;
  const created = tableBlocks(sql).map((block) => block.table);

  it('creates exactly the seven tables the design names', () => {
    expect([...created].sort()).toEqual([
      'phonemes',
      'program_day_items',
      'program_days',
      'rule_families',
      'sentence_items',
      'word_phonemes',
      'words',
    ]);
  });

  it('enables row level security on every one of them', () => {
    for (const table of created) {
      expect(sql, `RLS is not enabled on ${table}`).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`),
      );
    }
  });

  it('carries no profile_id column — content is global, not per-learner', () => {
    expect(withoutComments(sql)).not.toMatch(/profile_id/);
  });

  it('constrains the enumerated columns to their TypeScript unions', () => {
    expect(sql).toMatch(/check \(type in \('vowel', 'consonant', 'diphthong'\)\)/);
    expect(sql).toMatch(/check \(track in \('standard28', 'sprint21'\)\)/);
    expect(sql).toMatch(/check \(item_type in \('word', 'sentence', 'rule_family'\)\)/);
    expect(sql).toMatch(/check \(difficulty in \('easy', 'medium', 'hard'\)\)/);
  });

  it('holds a rule family to three examples and two counterexamples', () => {
    expect(sql).toMatch(/check \(cardinality\(examples\) = 3\)/);
    expect(sql).toMatch(/check \(cardinality\(counterexamples\) = 2\)/);
  });

  it('cascades a word deletion to its phonemes but protects a phoneme in use', () => {
    expect(sql).toMatch(/word_id\s+uuid\s+not null references public\.words \(id\) on delete cascade/);
    expect(sql).toMatch(/phoneme_id\s+uuid\s+not null references public\.phonemes \(id\) on delete restrict/);
  });
});

describe('005 notification tables', () => {
  const notifications = files.find((file) => file.version === '005');
  const sql = notifications === undefined ? '' : notifications.sql;
  const created = tableBlocks(sql).map((block) => block.table);

  it('creates exactly the three tables the design names', () => {
    expect([...created].sort()).toEqual([
      'notification_preferences',
      'notifications',
      'push_subscriptions',
    ]);
  });

  it('enables row level security on every one of them', () => {
    for (const table of created) {
      expect(sql, `RLS is not enabled on ${table}`).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`),
      );
    }
  });

  it('holds the idempotency key that stops a retried cron tick double-sending', () => {
    expect(sql).toMatch(/unique \(profile_id, type, scheduled_for\)/);
  });

  it('keeps the email channel legal so v2 needs no migration, in both tables', () => {
    const channelChecks = sql.match(/check \(channel in \([^)]*\)\)/g) ?? [];
    expect(channelChecks.length).toBe(1);
    expect(channelChecks[0]).toMatch(/'email'/);
    expect(sql).toMatch(/channels_delivered <@ array\['in_app', 'push', 'email'\]/);
  });

  it('names every NotificationType from 09-notifications.md, in both tables', () => {
    const types = [
      'daily_reminder',
      'streak_at_risk',
      'review_items_due',
      'exam_unlocked',
      'exam_result',
      'weekly_report',
      'milestone_reached',
      'product_update',
    ];
    for (const type of types) {
      const occurrences = sql.split(`'${type}'`).length - 1;
      expect(occurrences, `${type} is not constrained in both tables`).toBe(2);
    }
  });
});

describe('006 certificates', () => {
  const certificates = files.find((file) => file.version === '006');
  const sql = certificates === undefined ? '' : certificates.sql;

  it('creates the one table, with row level security on', () => {
    expect(tableBlocks(sql).map((block) => block.table)).toEqual(['certificates']);
    expect(sql).toMatch(/alter table public\.certificates enable row level security/);
  });

  it('carries a public verification code, unique and format-checked', () => {
    expect(sql).toMatch(/verification_code\s+text\s+not null unique/);
    expect(sql).toMatch(/check \(verification_code ~ '\^\[A-Z0-9\]\{4\}-\[A-Z0-9\]\{4\}-\[A-Z0-9\]\{4\}\$'\)/);
  });

  it('protects the attempt behind an issued certificate from deletion', () => {
    expect(sql).toMatch(
      /exam_attempt_id\s+uuid\s+not null references public\.exam_attempts \(id\) on delete restrict/,
    );
  });
});

describe('007 indexes', () => {
  const indexes = files.find((file) => file.version === '007');
  const sql = indexes === undefined ? '' : indexes.sql;

  /** `create index if not exists <name>` — the name is what a comment must match. */
  function createdIndexNames(source: string): readonly string[] {
    const pattern = /create index if not exists\s+(\w+)/gi;
    return [...source.matchAll(pattern)]
      .map((match) => match[1])
      .filter((name): name is string => name !== undefined);
  }

  function commentedIndexNames(source: string): readonly string[] {
    const pattern = /comment on index public\.(\w+) is/gi;
    return [...source.matchAll(pattern)]
      .map((match) => match[1])
      .filter((name): name is string => name !== undefined);
  }

  it('creates the access paths that are not already served by a unique constraint', () => {
    expect([...createdIndexNames(sql)].sort()).toEqual([
      'attempts_session_idx',
      'lesson_sessions_profile_day_idx',
      'notifications_profile_read_idx',
      'review_items_profile_due_idx',
      'words_rule_family_week_idx',
    ]);
  });

  it('names the query every index it creates serves', () => {
    const commented = new Set(commentedIndexNames(sql));
    for (const name of createdIndexNames(sql)) {
      expect(commented.has(name), `${name} has no comment naming its query`).toBe(true);
    }
  });

  it('documents the two constraint-backed btrees instead of duplicating them', () => {
    // 004 already indexes these three columns via `unique (...)`. A second
    // identical index would cost every write and serve no read the first
    // one does not.
    for (const name of ['exam_answers_question_unique', 'exam_questions_attempt_section_order_unique']) {
      expect(commentedIndexNames(sql), `${name} is undocumented`).toContain(name);
      expect(createdIndexNames(sql), `${name} is duplicated`).not.toContain(name);
    }
  });

  it('writes a comment that quotes a real select, not a description', () => {
    const bodies = [...sql.matchAll(/comment on index public\.\w+ is\s*\n?\s*'([^']*)'/gi)]
      .map((match) => match[1] ?? '');
    expect(bodies.length).toBe(8);
    for (const body of bodies) {
      expect(body, `comment is not a query: ${body}`).toMatch(/select .* from \w+ where /i);
    }
  });

  it('creates no index on a content table that nothing reads by', () => {
    // Content is small and read whole; only `words` earns an index, and only
    // because the lesson builder filters it.
    const onContent = createdIndexNames(sql).filter((name) =>
      /^(phonemes|rule_families|sentence_items|program_days|program_day_items|word_phonemes)_/.test(name),
    );
    expect(onContent).toEqual([]);
  });
});

describe('008 RLS policies', () => {
  const policies = files.find((file) => file.version === '008');
  const sql = policies === undefined ? '' : policies.sql;

  it('never grants the client a delete, on any table', () => {
    // Learner history is not the client's to erase. The two-user script proves
    // this at runtime; this catches it in review, where it is cheaper.
    expect(sql, '008 writes a delete policy').not.toMatch(/for delete/i);
    expect(withoutComments(sql), '008 grants delete').not.toMatch(/grant[^;]*\bdelete\b/i);
  });

  it('starts from revoke rather than trusting the default grants', () => {
    expect(sql).toMatch(/revoke all on all tables in schema public from anon, authenticated/);
  });

  it('writes no policy at all for exam_questions', () => {
    // RLS is on and no policy exists, so the table denies everything. A select
    // policy here would hand a learner the answer key mid-exam.
    expect(sql).not.toMatch(/create policy \S+ on public\.exam_questions/i);
    expect(withoutComments(sql)).not.toMatch(/grant[^;]*on public\.exam_questions/i);
  });

  it('pins the search path on the security definer helper', () => {
    // A security definer function that resolves its own table through a
    // caller-controlled search_path is a privilege escalation.
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/set search_path = public, pg_temp/);
  });

  it('exposes the public certificate view without the private columns', () => {
    const view = sql.match(/create or replace view public\.certificate_verifications as([\s\S]*?);/);
    expect(view).not.toBeNull();
    const body = view?.[1] ?? '';
    expect(body).toContain('verification_code');
    expect(body, 'the public view selects the owner').not.toMatch(/\bprofile_id\b/);
    expect(body, 'the public view selects progress history').not.toMatch(/\bcomparison\b/);
  });
});

describe('correct_answer is never handed to a client (F2.7)', () => {
  /**
   * The runtime proof in `migrations.apply.test.ts` checks the schema these
   * files currently produce. This checks every migration file that will ever
   * exist, including ones added long after Phase 2, because the realistic way
   * this protection dies is a later migration granting the table to make some
   * screen work.
   */
  it('no migration grants a client role anything on exam_questions', () => {
    for (const file of files) {
      const grants = withoutComments(file.sql)
        .split(';')
        .filter((statement) => /\bgrant\b/i.test(statement))
        .filter((statement) => /exam_questions/i.test(statement))
        .filter((statement) => /\b(anon|authenticated|public)\b/i.test(statement));
      expect(grants, `${file.name} grants a client role access to exam_questions`).toEqual([]);
    }
  });

  it('no migration writes an RLS policy on exam_questions', () => {
    for (const file of files) {
      expect(
        withoutComments(file.sql),
        `${file.name} writes a policy on exam_questions`,
      ).not.toMatch(/create policy \S+\s+on public\.exam_questions/i);
    }
  });

  it('no migration creates a view or function selecting correct_answer', () => {
    // A view runs as its owner and would bypass the table privileges entirely.
    for (const file of files) {
      const body = withoutComments(file.sql);
      const views = body.match(/create (or replace )?view[\s\S]*?;/gi) ?? [];
      for (const view of views) {
        expect(view, `${file.name} exposes correct_answer through a view`).not.toMatch(
          /\bcorrect_answer\b/i,
        );
      }
      const functions = body.match(/create (or replace )?function[\s\S]*?\$\$[\s\S]*?\$\$/gi) ?? [];
      for (const fn of functions) {
        expect(fn, `${file.name} exposes correct_answer through a function`).not.toMatch(
          /\bcorrect_answer\b/i,
        );
      }
    }
  });
});

describe('009 functions and triggers', () => {
  const functions = files.find((file) => file.version === '009');
  const sql = functions === undefined ? '' : functions.sql;

  function createdFunctionNames(source: string): readonly string[] {
    const pattern = /create or replace function public\.(\w+)/gi;
    return [...source.matchAll(pattern)]
      .map((match) => match[1])
      .filter((name): name is string => name !== undefined);
  }

  it('revokes execute from the client roles on every function it creates', () => {
    // Postgres grants execute to PUBLIC on a new function, so 008's revoke
    // sweep does not reach anything created here. Each revoke is load-bearing.
    for (const name of createdFunctionNames(sql)) {
      const revoke = new RegExp(`revoke all on function public\\.${name}\\b[\\s\\S]*?from public, anon, authenticated`);
      expect(sql, `${name} is left executable by the client`).toMatch(revoke);
    }
  });

  it('pins the search path on every security definer function', () => {
    // Comments are stripped first: the file header discusses `security definer`
    // in prose, and slicing on the raw text would test the prose.
    const definers = withoutComments(sql)
      .split('create or replace function')
      .slice(1)
      .filter((block) => /security definer/.test(block));
    expect(definers.length).toBeGreaterThan(0);
    for (const block of definers) {
      expect(block, 'a security definer function has an unpinned search_path').toMatch(
        /set search_path = public, pg_temp/,
      );
    }
  });

  it('leaves the domain rules to the domain', () => {
    // `CLAUDE.md` §10: no business logic in a Postgres function that a domain
    // service should own. The ladder, the mastery rule and the streak day
    // boundary are Phase 4 services; this file persists their output. The tell
    // would be arithmetic on those columns rather than assignment from a payload.
    const body = withoutComments(sql);
    expect(body, 'the interval ladder is being computed in SQL').not.toMatch(
      /interval_index\s*[+-]\s*\d/,
    );
    expect(body, 'the streak is being computed in SQL').not.toMatch(/current_streak\s*[+-]\s*\d/);
    // Accuracy is copied from the payload MasteryCalculator produced, never
    // derived here. Asserting the copy is precise; asserting the absence of
    // arithmetic is not.
    expect(body, 'mastery accuracy is not taken from the payload').toMatch(
      /accuracy\s*=\s*excluded\.accuracy/,
    );
    expect(body, 'mastery accuracy is being computed in SQL').not.toMatch(
      /accuracy\s*=\s*\(?\s*(correct|attempts)\b/,
    );
    expect(body, 'a timezone boundary is being decided in SQL').not.toMatch(/at time zone/i);
  });

  it('does not fail the migration on a database without pg_cron', () => {
    // 001 downgrades a failed `create extension pg_cron` to a notice, so this
    // file must not assume it succeeded. Phase 7 needs the job; Phase 2 does not.
    expect(sql).toMatch(/if exists \(select 1 from pg_extension where extname = 'pg_cron'\)/);
    expect(sql).toMatch(/raise notice/);
  });

  it('marks an auto-submitted attempt submitted, never graded', () => {
    // The deadline passing is not a grade. Scoring is the exam engine's.
    const fn = sql.match(/function public\.autosubmit_expired_exam_attempts[\s\S]*?\$\$;/);
    expect(fn).not.toBeNull();
    const body = fn?.[0] ?? '';
    expect(body).toMatch(/status\s*=\s*'submitted'/);
    expect(body, 'auto-submit writes a score').not.toMatch(/score_percent\s*=/);
    expect(body, 'auto-submit decides pass or fail').not.toMatch(/passed\s*=/);
  });
});
