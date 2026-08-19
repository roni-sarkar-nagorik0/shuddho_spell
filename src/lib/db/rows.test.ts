// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * The row interfaces are hand-written from the SQL and must stay true to it.
 *
 * `03-database.md` names `supabase gen types` as the verifier. The CLI is not
 * installed here on purpose — F2.1 established the no-Docker, no-Supabase-CLI
 * migration path, and the CLI additionally needs live project credentials, so
 * a gate built on it would not run in CI. What `gen types` actually does is
 * read the Postgres catalogue and map each column to a TypeScript type. This
 * reads the same catalogue, from the same migrations, inside PGlite, and
 * applies the same mapping — the CLI's own rules, without the CLI. It is the
 * stricter of the two: it also checks column order, `readonly` on every
 * member, file naming, and that no row interface has escaped `infrastructure/`.
 * Recorded as D20.
 */

const MIGRATIONS_DIR = 'supabase/migrations';
const MODULES_DIR = 'src/modules';

const AUTH_SHIM = `
  create schema if not exists auth;
  create table if not exists auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  do $$ begin create role anon; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
  grant usage on schema auth to anon, authenticated, service_role;
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`;

/**
 * The mapping `supabase gen types` uses, restricted to the types this schema
 * actually has. An unmapped type is a failure rather than a silent `unknown`:
 * a column type nobody thought about is exactly the case worth stopping on.
 */
const TYPE_MAP: Readonly<Record<string, string>> = {
  uuid: 'string',
  text: 'string',
  boolean: 'boolean',
  integer: 'number',
  smallint: 'number',
  bigint: 'number',
  date: 'string',
  'timestamp with time zone': 'string',
  'time without time zone': 'string',
  jsonb: 'Json',
  'text[]': 'readonly string[]',
  'uuid[]': 'readonly string[]',
};

function toTypeScript(pgType: string, notNull: boolean): string {
  // `numeric(5,2)` and `numeric` are the same TypeScript type; the precision is
  // the database's business and is asserted in `migrations.apply.test.ts`.
  const base = pgType.startsWith('numeric') ? 'number' : TYPE_MAP[pgType];
  if (base === undefined) throw new Error(`no TypeScript mapping for the column type ${pgType}`);
  return notNull ? base : `${base} | null`;
}

interface IColumn {
  readonly name: string;
  readonly type: string;
}

interface IRowFile {
  /** Repo-relative path. */
  readonly path: string;
  readonly module: string;
  readonly fileName: string;
  readonly interfaceName: string;
  /** The `public.<table>` the doc comment says this row mirrors. */
  readonly table: string;
  readonly members: readonly IColumn[];
  readonly mutableMembers: readonly string[];
}

function sourceFilesUnder(dir: string): readonly string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    return entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/** Parses one `*.row.ts` with the compiler, not a regular expression. */
function readRowFile(path: string): IRowFile {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ESNext, true);

  const declarations = source.statements.filter(ts.isInterfaceDeclaration);
  if (declarations.length !== 1) {
    throw new Error(`${path} declares ${String(declarations.length)} interfaces, expected exactly 1`);
  }
  const declaration = declarations[0];
  if (declaration === undefined) throw new Error(`${path} has no interface`);

  const table = /public\.(\w+)/.exec(text)?.[1];
  if (table === undefined) throw new Error(`${path} does not name the public.<table> it mirrors`);

  const members: IColumn[] = [];
  const mutableMembers: string[] = [];
  for (const member of declaration.members) {
    if (!ts.isPropertySignature(member) || member.type === undefined) {
      throw new Error(`${path} has a member that is not a typed property`);
    }
    const name = member.name.getText(source);
    members.push({ name, type: member.type.getText(source) });
    const isReadonly = (member.modifiers ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
    );
    if (!isReadonly) mutableMembers.push(name);
  }

  const segments = path.split('/');
  return {
    path,
    module: segments[2] ?? '',
    fileName: segments[segments.length - 1] ?? '',
    interfaceName: declaration.name.getText(source),
    table,
    members,
    mutableMembers,
  };
}

const rowFiles: readonly IRowFile[] = sourceFilesUnder(MODULES_DIR)
  .filter((path) => path.endsWith('.row.ts'))
  .sort()
  .map(readRowFile);

describe('hand-written row interfaces (F2.10)', () => {
  let catalogue: ReadonlyMap<string, readonly IColumn[]> = new Map();

  beforeAll(async () => {
    const db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
    await db.exec(AUTH_SHIM);
    for (const name of readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
    }
    // pg_attribute rather than information_schema: attnum gives the real column
    // order, which information_schema.ordinal_position also does but without
    // the not-null flag in the same row.
    const result = await db.query<{
      readonly tbl: string;
      readonly col: string;
      readonly typ: string;
      readonly notnull: boolean;
    }>(
      `select c.relname as tbl, a.attname as col,
              format_type(a.atttypid, a.atttypmod) as typ, a.attnotnull as notnull
         from pg_attribute a
         join pg_class c     on c.oid = a.attrelid
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and a.attnum > 0
          and not a.attisdropped
        order by c.relname, a.attnum`,
    );
    const built = new Map<string, IColumn[]>();
    for (const row of result.rows) {
      const columns = built.get(row.tbl) ?? [];
      columns.push({ name: row.col, type: toTypeScript(row.typ, row.notnull) });
      built.set(row.tbl, columns);
    }
    catalogue = built;
    await db.close();
  }, 60_000);

  it('covers every table in the schema, exactly once', () => {
    // A table added in a later phase without a row interface fails here, which
    // is the only moment anyone is looking at the schema and the types together.
    const mirrored = rowFiles.map((file) => file.table).sort();
    expect(new Set(mirrored).size, 'two row interfaces claim the same table').toBe(mirrored.length);
    expect(mirrored).toEqual([...catalogue.keys()].sort());
  });

  it('matches the catalogue column for column, in order and in type', () => {
    // This is the `supabase gen types` comparison: same names, same order,
    // same mapped types, same nullability.
    for (const file of rowFiles) {
      const expected = catalogue.get(file.table);
      expect(expected, `${file.path} mirrors an unknown table`).toBeDefined();
      expect(file.members, `${file.path} has drifted from public.${file.table}`).toEqual(
        expected === undefined ? [] : [...expected],
      );
    }
  });

  it('marks every property readonly', () => {
    for (const file of rowFiles) {
      expect(file.mutableMembers, `${file.path} has mutable properties`).toEqual([]);
    }
  });

  it('names the file after the interface, one public symbol each', () => {
    for (const file of rowFiles) {
      expect(file.interfaceName, `${file.path} is not an I-prefixed Row`).toMatch(/^I[A-Za-z]+Row$/);
      const kebab = file.interfaceName
        .slice(1)
        .replace(/Row$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();
      expect(file.fileName, `${file.interfaceName} is in the wrong file`).toBe(`${kebab}.row.ts`);
    }
  });

  it('lives in the module that owns the table', () => {
    const OWNER: Readonly<Record<string, string>> = {
      learner_profiles: 'auth',
      phonemes: 'library',
      rule_families: 'library',
      words: 'library',
      word_phonemes: 'library',
      sentence_items: 'library',
      program_days: 'program',
      program_day_items: 'program',
      lesson_sessions: 'lessons',
      attempts: 'lessons',
      review_items: 'review',
      mastery_records: 'progress',
      streak_records: 'progress',
      exam_definitions: 'exams',
      exam_sections: 'exams',
      exam_attempts: 'exams',
      exam_questions: 'exams',
      exam_answers: 'exams',
      notifications: 'notifications',
      notification_preferences: 'notifications',
      push_subscriptions: 'notifications',
      certificates: 'certificates',
    };
    for (const file of rowFiles) {
      expect(OWNER[file.table], `no module is recorded as owning ${file.table}`).toBeDefined();
      expect(file.module, `${file.path} is in the wrong module`).toBe(OWNER[file.table]);
    }
  });

  it('declares no row interface outside infrastructure/rows/', () => {
    // Test files are excluded: a test may describe a query result locally, and
    // it cannot leak a snake_case shape into the domain the way a source file
    // can. Every other file in `src` is in scope.
    const offending = sourceFilesUnder('src')
      .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
      .filter((path) => /(^|\n)\s*(export )?interface I\w*Row\b/.test(readFileSync(path, 'utf8')))
      .filter((path) => !/^src\/modules\/[^/]+\/infrastructure\/rows\/[^/]+\.row\.ts$/.test(path));
    expect(offending).toEqual([]);
  });

  it('is imported by nothing outside its own infrastructure folder', () => {
    // `eslint-plugin-boundaries` already stops domain, application,
    // presentation and app from reaching infrastructure at all. This closes the
    // one door it leaves open: infrastructure may import infrastructure, so one
    // module could pull another module's row shape across a seam that is
    // supposed to be a repository call.
    const offending: string[] = [];
    for (const path of sourceFilesUnder('src')) {
      const importing = /from '([^']*\.row)'/g;
      for (const match of readFileSync(path, 'utf8').matchAll(importing)) {
        const owner = /^src\/modules\/([^/]+)\/infrastructure\//.exec(path);
        if (owner === null) {
          offending.push(`${path} imports ${match[1] ?? ''}`);
          continue;
        }
        const specifier = match[1] ?? '';
        const foreign = /^@\/modules\/([^/]+)\//.exec(specifier);
        if (foreign !== null && foreign[1] !== owner[1]) {
          offending.push(`${path} imports ${specifier} from another module`);
        }
      }
    }
    expect(offending).toEqual([]);
  });

  it('types a jsonb column as Json and nothing narrower', () => {
    // The database guarantees well-formed JSON and no more. A row interface
    // that claims a shape is claiming something the schema does not enforce;
    // narrowing belongs to the mapper, which is allowed to fail.
    for (const file of rowFiles) {
      const columns = catalogue.get(file.table) ?? [];
      for (const column of columns) {
        if (!column.type.startsWith('Json')) continue;
        const declared = file.members.find((member) => member.name === column.name);
        expect(declared?.type, `${file.path}.${column.name} narrows a jsonb column`).toBe(
          column.type,
        );
      }
    }
  });
});
