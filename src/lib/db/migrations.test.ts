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
