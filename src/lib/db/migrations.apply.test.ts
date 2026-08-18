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

async function applyAll(db: PGlite): Promise<void> {
  for (const name of migrations) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
  }
}

const EXPECTED_TABLES: readonly string[] = [
  'phonemes',
  'program_day_items',
  'program_days',
  'rule_families',
  'sentence_items',
  'word_phonemes',
  'words',
];

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

  it('creates exactly the content tables the design names', async () => {
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
});
