/**
 * F13.6 — the RLS two-user check, run against a real database.
 *
 * `08-rls_policies.sql` is written "as if the API did not exist", and the only
 * honest way to test that claim is to bypass the API entirely: connect as two
 * different learners with their own anon-key sessions and try to read each
 * other's rows. Every unit test in this repo runs above RLS and proves nothing
 * about it.
 *
 * It needs live credentials and two seeded learners. Without them it says so
 * and exits 0 — a check that cannot run is not a check that failed, and making
 * it red would train people to ignore it.
 *
 *   node --env-file-if-exists=.env.local scripts/rls-two-user.mjs
 */
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const A_EMAIL = process.env.E2E_LEARNER_EMAIL ?? '';
const A_PASSWORD = process.env.E2E_LEARNER_PASSWORD ?? '';
const B_EMAIL = process.env.E2E_LEARNER_B_EMAIL ?? '';
const B_PASSWORD = process.env.E2E_LEARNER_B_PASSWORD ?? '';

/** Every learner-owned table. A new one missing from this list is the gap. */
const LEARNER_TABLES = [
  'learner_profiles',
  'lesson_sessions',
  'attempts',
  'review_items',
  'mastery_records',
  'streak_records',
  'exam_attempts',
  'exam_answers',
  'notifications',
  'notification_preferences',
  'push_subscriptions',
  'certificates',
];

/** Tables no client role may read at all, whoever they are. */
const FORBIDDEN_TABLES = ['exam_questions'];

if ([URL, ANON, A_EMAIL, A_PASSWORD, B_EMAIL, B_PASSWORD].some((value) => value === '')) {
  process.stdout.write(
    'rls-two-user: skipped — needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and two\n' +
      'seeded learners (E2E_LEARNER_EMAIL/PASSWORD and E2E_LEARNER_B_EMAIL/PASSWORD).\n' +
      'Nothing was verified.\n',
  );
  process.exit(0);
}

/**
 * Whose row this is. Most learner tables key on `profile_id`; `learner_profiles`
 * itself keys on `user_id`.
 *
 * @param {Record<string, unknown>} row
 * @returns {string | null}
 */
function ownerOf(row) {
  const owner = row['profile_id'] ?? row['user_id'];

  return typeof owner === 'string' ? owner : null;
}

/**
 * @param {string} email
 * @param {string} password
 */
async function signIn(email, password) {
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error !== null) {
    throw new Error(`could not sign in ${email}: ${error.message}`);
  }

  return { client, userId: data.user.id };
}

const failures = [];

/**
 * @param {boolean} passed
 * @param {string} message
 */
function check(passed, message) {
  if (passed) {
    process.stdout.write(`  ok    ${message}\n`);
  } else {
    failures.push(message);
    process.stdout.write(`  FAIL  ${message}\n`);
  }
}

const a = await signIn(A_EMAIL, A_PASSWORD);
const b = await signIn(B_EMAIL, B_PASSWORD);

process.stdout.write('learner A sees only their own rows\n');

for (const table of LEARNER_TABLES) {
  const { data, error } = await a.client.from(table).select('*').limit(500);

  if (error !== null) {
    // A table a learner cannot read at all is stricter than required, not a
    // failure — several are written by the service role only.
    process.stdout.write(`  ----  ${table}: not readable by a learner (${error.code})\n`);
    continue;
  }

  const rows = /** @type {readonly Record<string, unknown>[]} */ (data);
  const foreign = rows.filter((row) => ownerOf(row) === b.userId);

  check(foreign.length === 0, `${table}: A sees ${String(foreign.length)} of B's rows`);
}

process.stdout.write('\nexam_questions is unreadable by any client role\n');

for (const table of FORBIDDEN_TABLES) {
  const { data, error } = await a.client.from(table).select('*').limit(1);
  const rows = /** @type {readonly unknown[]} */ (data ?? []);

  check(
    error !== null || rows.length === 0,
    `${table}: a learner read ${String(rows.length)} rows — correct_answer is exposed`,
  );
}

process.stdout.write('\nA cannot write into B’s rows\n');

const { error: writeError } = await a.client
  .from('learner_profiles')
  .update({ current_day_index: 28 })
  .eq('user_id', b.userId);

check(
  writeError !== null,
  "learner_profiles: A's update of B's profile was not refused",
);

process.stdout.write('\n');

if (failures.length > 0) {
  process.stderr.write(`rls-two-user: ${String(failures.length)} failure(s).\n`);
  process.exit(1);
}

process.stdout.write('rls-two-user: every check passed.\n');
