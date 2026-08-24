/**
 * Migration runner — plain SQL, forward-only, against a hosted Supabase project.
 *
 *   pnpm db:migrate            apply every pending migration
 *   pnpm db:migrate --dry-run  list what would be applied, without connecting
 *
 * No Docker, no local database, no Supabase CLI: this connects to DATABASE_URL
 * and runs the numbered files in supabase/migrations in order.
 *
 * This script never reads an env file itself — `node --env-file-if-exists` hands
 * it DATABASE_URL, and the value is never printed.
 *
 * Forward-only is enforced by checksum: once a migration is recorded as applied,
 * editing that file is an error. Add a new numbered migration instead.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import console from 'node:console';
import {
  UNREACHABLE_HELP,
  connectDatabase,
  normaliseDatabaseUrl,
} from './lib/database-url.mjs';

const MIGRATIONS_DIR = 'supabase/migrations';

/** @typedef {{ version: string, name: string, sql: string, checksum: string }} Migration */

/** @returns {Migration[]} */
function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS_DIR, name), 'utf8');
      return {
        version: name.slice(0, 3),
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex').slice(0, 16),
      };
    });
}

const LEDGER = `
  create table if not exists public.schema_migrations (
    version     text primary key,
    name        text        not null,
    checksum    text        not null,
    applied_at  timestamptz not null default now()
  );
`;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const migrations = loadMigrations();

  if (migrations.length === 0) {
    console.error(`No .sql files in ${MIGRATIONS_DIR}.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`${String(migrations.length)} migration(s) on disk:\n`);
    for (const m of migrations) {
      console.log(`  ${m.name}  ${m.checksum}`);
    }
    console.log('\nDry run — nothing was applied and no connection was opened.');
    return;
  }

  const rawConnectionString = process.env['DATABASE_URL'];
  if (rawConnectionString === undefined || rawConnectionString === '') {
    // Where to put it depends on where you are, and telling somebody on a CI
    // runner to edit `.env.local` sends them looking for a file that will never
    // exist there. The value is the same in both places; the instruction is not.
    const onCi = process.env['GITHUB_ACTIONS'] === 'true' || process.env['CI'] === 'true';

    console.error(
      onCi
        ? 'DATABASE_URL is not set. The workflow supplies it from the\n' +
            'PRODUCTION_DATABASE_URL secret — add it under Settings → Secrets and\n' +
            'variables → Actions, or as an environment secret on the environment\n' +
            'this job runs in. The value is the Supabase pooler URI: Project\n' +
            'Settings → Database → Connection string → URI.'
        : 'DATABASE_URL is not set. Put it in .env.local — Supabase dashboard →\n' +
            'Project Settings → Database → Connection string → URI. See README → Getting started.',
    );
    process.exit(1);
  }

  const connectionString = normaliseDatabaseUrl(rawConnectionString);
  if (connectionString !== rawConnectionString) {
    console.log(
      'Encoded reserved characters in the DATABASE_URL password so it is a valid URI.',
    );
  }

  /** @type {import('pg').Client} */
  let client;
  try {
    client = await connectDatabase(connectionString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nCould not connect to the database: ${message}`);
    console.error(`\n${UNREACHABLE_HELP}`);
    process.exit(1);
  }

  try {
    await client.query(LEDGER);
    /** @type {{ rows: { version: string, name: string, checksum: string }[] }} */
    const applied = await client.query('select version, name, checksum from public.schema_migrations');
    const byVersion = new Map(applied.rows.map((row) => [row.version, row]));

    let count = 0;
    for (const migration of migrations) {
      const record = byVersion.get(migration.version);

      if (record !== undefined) {
        if (record.checksum !== migration.checksum) {
          console.error(
            `\n${migration.name} has changed since it was applied.\n` +
              'Migrations are forward-only: never edit a shipped file, add a new numbered one.',
          );
          process.exit(1);
        }
        console.log(`  = ${migration.name} (already applied)`);
        continue;
      }

      console.log(`  + ${migration.name}`);
      await client.query('begin');
      try {
        await client.query(migration.sql);
        await client.query(
          'insert into public.schema_migrations (version, name, checksum) values ($1, $2, $3)',
          [migration.version, migration.name, migration.checksum],
        );
        await client.query('commit');
        count += 1;
      } catch (error) {
        await client.query('rollback');
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n${migration.name} failed and was rolled back:\n  ${message}`);
        process.exit(1);
      }
    }

    try {
      await client.query("notify pgrst, 'reload schema'");
    } catch {
      // Hosted PostgREST often reloads on its own; this is a nudge, not a gate.
    }

    console.log(
      count === 0 ? '\nDatabase already up to date.' : `\nApplied ${String(count)} migration(s).`,
    );
  } finally {
    await client.end();
  }
}

await main().catch(/** @param {unknown} error */ (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nMigration run failed: ${message}`);
  process.exit(1);
});
