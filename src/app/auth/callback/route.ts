import { NextResponse, type NextRequest } from 'next/server';
import { createContainer } from '@/composition/container';
import { makeBootstrapProfile } from '@/composition/use-cases';
import { publicEnv } from '@/lib/env.public';
import { logger } from '@/lib/logger';
import { createSessionClient } from '@/lib/supabase/session-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGN_IN_FAILED = '/login?error=google';
const ONBOARDING = '/onboarding';
const DASHBOARD = '/dashboard';

function goTo(path: string): NextResponse {
  // 303: whatever the browser arrived with, it continues with GET.
  return NextResponse.redirect(new URL(path, publicEnv.NEXT_PUBLIC_APP_URL), 303);
}

function readMetadata(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }

  // Google supplies one or the other depending on the account; 009 reads both.
  for (const key of ['full_name', 'name']) {
    const value: unknown = Reflect.get(metadata, key);
    if (typeof value === 'string') {
      return value;
    }
  }

  return undefined;
}

/**
 * Step 2 and 3 of the flow in `04-authentication.md`: turn the code Google sent
 * back into a cookie session, then route on whether this learner has been here.
 *
 * The exchange runs on the server client, not a browser one. The PKCE verifier
 * `/auth/signin` minted was written through our cookie adapter and is therefore
 * httpOnly (D21) — only this side can read it back. The session cookies the
 * exchange writes go out the same way.
 *
 * Every failure lands on `/login?error=google`, the surface F3.2 already built,
 * rather than rendering a second error page. A learner who cancels at Google's
 * consent screen and one whose code is stale both just need the button again.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const refusal = params.get('error');
  const code = params.get('code');

  if (refusal !== null) {
    logger.warn({ refusal }, 'google refused the sign-in');
    return goTo(SIGN_IN_FAILED);
  }

  if (code === null) {
    logger.warn('reached the callback with no code');
    return goTo(SIGN_IN_FAILED);
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    logger.error({ err: error }, 'could not exchange the code for a session');
    return goTo(SIGN_IN_FAILED);
  }

  // `AuthTokenResponse` is a discriminated union: a null error means the session
  // is there. Re-checking it is not defensive, it is unreachable.

  // The first authenticated request there is, by construction — which is where
  // `04-authentication.md` puts the reconciler. 009's trigger has almost
  // certainly made the profile already; this is what makes "almost" survivable,
  // and it is also what stops `requireUser()` throwing further down the flow.
  const { user } = data.session;
  const bootstrap = makeBootstrapProfile(createContainer(crypto.randomUUID()));

  try {
    const profile = await bootstrap.execute({
      userId: user.id,
      fullName: readMetadata(user.user_metadata),
      email: user.email,
    });

    // `/onboarding` is the safe end of this decision. Sending an
    // already-onboarded learner through it costs them a screen; sending a brand
    // new one to a dashboard with no answers to render is a broken first
    // impression.
    return goTo(profile.hasOnboarded() ? DASHBOARD : ONBOARDING);
  } catch (caught: unknown) {
    logger.error({ err: caught }, 'signed in, but could not reconcile the learner profile');
    return goTo(ONBOARDING);
  }
}
