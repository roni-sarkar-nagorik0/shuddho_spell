/**
 * Getting a `pg.Client` onto a hosted Supabase project, for the two scripts
 * that need one.
 *
 * This lived inside `migrate.mjs`, which is where it was written and where it
 * was needed first. `content-seed.ts` then opened its own client from the raw
 * `DATABASE_URL` — and did not work at all: the same URI the migration runner
 * connects with threw `Invalid URL` before a single row was read, because a
 * password with a `?` in it is not a valid URL and `pg` parses with `new URL()`.
 * The seed was not missing a small refinement, it was missing the whole of this
 * file. Two scripts pointed at one database is not the place for two answers
 * to "can you reach it".
 *
 * Neither of the two facts here is a preference. A Supabase password is
 * generated with reserved characters in it, and the direct
 * `db.<ref>.supabase.co` host is IPv6-only — so on an ordinary IPv4 network the
 * URI the dashboard hands you does not parse *and* the host it names does not
 * resolve. Everything below is those two things and nothing else.
 *
 * This module never reads an env file and never prints a connection string.
 */
import console from 'node:console';
import pg from 'pg';

/**
 * Postgres URIs with a raw `?`, `#` or `/` in the password are not valid URLs.
 * `pg` parses them with `new URL()`, which throws `Invalid URL`. The userinfo
 * is encoded; the rest of the URI is left alone. A URI that already parses is
 * returned unchanged so an already-encoded password is not double-encoded.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normaliseDatabaseUrl(raw) {
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
      urls.push(`postgresql://${user}:${pass}@${prefix}-${region}.pooler.supabase.com:5432/${db}`);
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
export async function connectDatabase(connectionString) {
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

  console.log('Direct host did not resolve (IPv6-only). Trying the Session pooler…');

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

/**
 * What to print when neither the direct host nor the pooler answered. Shared so
 * the seed does not tell a different story about the same failure.
 */
export const UNREACHABLE_HELP =
  'Supabase serves the direct host (db.<ref>.supabase.co) over IPv6 only. On an\n' +
  'IPv4-only network it is unreachable. Use the Session pooler URI instead:\n' +
  '  Supabase → Project Settings → Database → Connection string → Session pooler\n' +
  '  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres';
