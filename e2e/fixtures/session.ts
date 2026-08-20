import { type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * A real signed-in session for the e2e flows, minted rather than clicked
 * through.
 *
 * **Google sign-in cannot be automated**, and should not be: driving a real
 * Google consent screen from CI means storing a real Google password, and
 * `04-authentication.md` makes Google the only provider precisely so that no
 * password exists anywhere in this system. So the flows below sign in the way a
 * *server* does — Supabase's admin API issues a session for a seeded test user,
 * and the cookies go into the browser context.
 *
 * What this does and does not prove is worth being exact about. It proves every
 * screen behind the session: the dashboard, a whole lesson, an exam with a
 * refresh in the middle, a failure producing its prescription. It does **not**
 * prove the Google handshake itself — `e2e/auth-callback.spec.ts` covers the
 * callback route's own behaviour, and the handshake beyond it is Google's.
 *
 * Everything here needs live credentials. Without them the specs that use it
 * are skipped with a reason that names what is missing, rather than failing in a
 * way that reads as a broken product.
 */

export interface ITestSession {
  readonly email: string;
  readonly userId: string;
}

const EMAIL = process.env['E2E_LEARNER_EMAIL'] ?? '';
const PASSWORD = process.env['E2E_LEARNER_PASSWORD'] ?? '';
const URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
const SERVICE_ROLE = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

/**
 * Whether these tests can run at all.
 *
 * Read once and exported, so each spec can state its own reason for skipping
 * instead of every file re-deriving it.
 */
export const CAN_SIGN_IN = URL !== '' && SERVICE_ROLE !== '' && ANON !== '' && EMAIL !== '' && PASSWORD !== '';

export const MISSING_CREDENTIALS =
  'needs a live Supabase project and a seeded learner: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, E2E_LEARNER_EMAIL, E2E_LEARNER_PASSWORD';

/**
 * Signs the seeded learner in and installs the session cookies on the context.
 *
 * The password grant is used only here and only for a user the seed created for
 * this purpose. It is not a second way into the product: no route accepts a
 * password, no UI offers one, and `one-door.test.ts` still holds. This talks to
 * Supabase directly, around the application entirely.
 */
export async function signIn(context: BrowserContext, baseUrl: string): Promise<ITestSession> {
  const client = createClient(URL, ANON, { auth: { persistSession: false } });

  const { data, error } = await client.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  // `error` and `data.session` are a discriminated pair in the client's return
  // type, so narrowing on the error is enough — a second check on the session
  // is dead code the linter is right to flag.
  if (error !== null) {
    throw new Error(
      `could not mint a test session: ${error.message}. ` +
        'Seed the learner and set the E2E_LEARNER_* variables before running the flows.',
    );
  }

  const { origin } = new global.URL(baseUrl);
  const projectRef = new global.URL(URL).hostname.split('.')[0] ?? 'local';

  // `@supabase/ssr` stores the session under `sb-<ref>-auth-token`. Writing it
  // directly is what lets the browser arrive already signed in, without a
  // consent screen this suite must never automate.
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: JSON.stringify([data.session.access_token, data.session.refresh_token]),
      url: origin,
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);

  return { email: EMAIL, userId: data.session.user.id };
}
