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
import pg from 'pg';

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

/**
 * Postgres URIs with a raw `?`, `#` or `/` in the password are not valid URLs.
 * `pg` parses them with `new URL()`, which throws `Invalid URL`. The userinfo
 * is encoded; the rest of the URI is left alone. A URI that already parses is
 * returned unchanged so an already-encoded password is not double-encoded.
 *
 * @param {string} raw
 * @returns {string}
 */
function normaliseDatabaseUrl(raw) {
  try {
    // Throws if the password contains reserved characters.
    new URL(raw);
    return raw;
  } catch {
    const match = /^(postgres(?:ql)?:\/\/)([^@]*)(@[\s\S]+)$/u.exec(raw);

    // All three groups are mandatory, so a match has all three — but the type
    // of a capture is `string | undefined`, and the one honest way to say that
    // is to check it. The no-match case throws the same error it always did.
    const [, scheme, userinfo, rest] = match ?? [];

    if (scheme === undefined || userinfo === undefined || rest === undefined) {
      throw new Error('DATABASE_URL is not a postgres URI');
    }

    const colon = userinfo.indexOf(':');

    if (colon === -1) {
      return `${scheme}${encodeURIComponent(userinfo)}${rest}`;
    }

    const user = userinfo.slice(0, colon);
    const password = userinfo.slice(colon + 1);
    return `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(password)}${rest}`;
  }
}

/**
 * Direct `db.<ref>.supabase.co` hosts are IPv6-only. Session poolers have IPv4
 * addresses. These are the regions Supabase currently offers; the first match
 * that accepts the project's password is the project's region.
 */
const POOLER_REGIONS = Object.freeze([
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'eu-west-1',
  'ap-northeast-1',
  'eu-central-1',
  'us-west-1',
  'ap-southeast-2',
  'us-east-2',
  'ca-central-1',
  'sa-east-1',
  'eu-west-2',
  'ap-northeast-2',
  'eu-north-1',
]);

/**
 * @param {string} connectionString
 * @returns {pg.Client}
 */
function createClient(connectionString) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  client.on('notice', (notice) => {
    console.log(`  notice: ${notice.message ?? ''}`);
  });
  return client;
}

/**
 * @param {string} connectionString
 * @returns {Promise<pg.Client | null>}
 */
async function connectOnce(connectionString) {
  const client = createClient(connectionString);
  try {
    await client.connect();
    return client;
  } catch {
    await client.end().catch(() => undefined);
    return null;
  }
}

/**
 * Session-pooler URIs for a project ref, covering aws-0 and aws-1 host prefixes.
 *
 * @param {string} ref
 * @param {string} password
 * @param {string} database
 * @returns {string[]}
 */
function poolerUrls(ref, password, database) {
  const user = encodeURIComponent(`postgres.${ref}`);
  const pass = encodeURIComponent(password);
  const db = encodeURIComponent(database);
  /** @type {string[]} */
  const urls = [];
  for (const region of POOLER_REGIONS) {
    for (const prefix of ['aws-0', 'aws-1']) {
      urls.push(
        `postgresql://${user}:${pass}@${prefix}-${region}.pooler.supabase.com:5432/${db}`,
      );
    }
  }
  return urls;
}

/**
 * Connect to DATABASE_URL, falling back to the Session pooler when the direct
 * host does not resolve (IPv6-only `db.<ref>.supabase.co` on an IPv4 network).
 *
 * @param {string} connectionString
 * @returns {Promise<pg.Client>}
 */
async function connectDatabase(connectionString) {
  const direct = await connectOnce(connectionString);
  if (direct !== null) {
    return direct;
  }

  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    parsed = null;
  }

  const host = parsed?.hostname ?? '';
  const isDirect = /^db\.[^.]+\.supabase\.co$/u.test(host);

  if (parsed === null || !isDirect) {
    throw new Error('could not reach DATABASE_URL');
  }

  const ref = host.slice('db.'.length, host.length - '.supabase.co'.length);
  const password = decodeURIComponent(parsed.password);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//u, '')) || 'postgres';

  console.log(
    'Direct host did not resolve (IPv6-only). Trying the Session pooler…',
  );

  const urls = poolerUrls(ref, password, database);
  /** @type {pg.Client[]} */
  const opened = [];

  try {
    const winner = await Promise.any(
      urls.map(async (url) => {
        const client = await connectOnce(url);
        if (client === null) {
          throw new Error('miss');
        }
        opened.push(client);
        return client;
      }),
    );

    for (const extra of opened) {
      if (extra !== winner) {
        await extra.end().catch(() => undefined);
      }
    }

    console.log('Connected via Session pooler.');
    return winner;
  } catch {
    for (const extra of opened) {
      await extra.end().catch(() => undefined);
    }
    throw new Error('could not reach DATABASE_URL or the Session pooler');
  }
}

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

  /** @type {pg.Client} */
  let client;
  try {
    client = await connectDatabase(connectionString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nCould not connect to the database: ${message}`);
    console.error(
      '\nSupabase serves the direct host (db.<ref>.supabase.co) over IPv6 only. On an\n' +
        'IPv4-only network it is unreachable. Use the Session pooler URI instead:\n' +
        '  Supabase → Project Settings → Database → Connection string → Session pooler\n' +
        '  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres',
    );
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
