import { NextResponse } from 'next/server';
import { publicEnv } from '@/lib/env.public';
import { logger } from '@/lib/logger';
import { createSessionClient } from '@/lib/supabase/session-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Step 1 of the flow in `04-authentication.md`: turn the button press on `/login`
 * into a redirect to Google.
 *
 * The url is built server-side on purpose. `signInWithOAuth` also writes the PKCE
 * code verifier through the cookie adapter, and that cookie must be httpOnly and
 * readable by `/auth/callback` — neither is true of a browser client (D21).
 *
 * POST, not GET: pressing this mints a verifier and replaces any previous one, so
 * it must not be reachable by a prefetch, an image tag or a link.
 */
export async function POST(): Promise<NextResponse> {
  const supabase = await createSessionClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });

  if (error !== null) {
    logger.error({ err: error }, 'could not build the Google sign-in url');
    return NextResponse.redirect(
      new URL('/login?error=google', publicEnv.NEXT_PUBLIC_APP_URL),
      303,
    );
  }

  // 303, so the browser follows with GET and a refresh cannot re-post the form.
  return NextResponse.redirect(data.url, 303);
}
