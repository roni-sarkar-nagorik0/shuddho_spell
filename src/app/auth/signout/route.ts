import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { publicEnv } from '@/lib/env.public';
import { logger } from '@/lib/logger';
import { createSessionClient } from '@/lib/supabase/session-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The prefix `@supabase/ssr` names every one of its session cookies with. */
const SESSION_COOKIE_PREFIX = 'sb-';

/**
 * The way out. The mirror of `/auth/signin`, and deliberately its shape.
 *
 * POST, not GET, for a sharper reason than the sign-in route has. A link the
 * browser may follow on its own is a link Next prefetches on hover and a link
 * any image tag on any page can fire — and the whole effect of this route is
 * destructive. `<a href="/auth/signout">` signs a learner out because something
 * guessed they might click it. A form post cannot be fired cross-origin without
 * the learner pressing the button.
 *
 * `scope: 'local'` — this browser's session, not every session the learner has.
 * The library's default is `global`, which revokes the refresh token on their
 * phone as well, and "sign out" pressed on a laptop does not mean "sign me out
 * of my phone". Local is still a *server-side* revocation: the session behind
 * this cookie is dead at Supabase, so a copied cookie is dead with it, and
 * deleting it here is not the only thing protecting the account.
 *
 * On success the cookies clear through the same adapter the callback wrote them
 * with — `@supabase/ssr` removes an item by setting it empty with `maxAge: 0`,
 * which goes through `toSessionCookieOptions` like every other write.
 */
export async function POST(): Promise<NextResponse> {
  const supabase = await createSessionClient();

  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error !== null) {
    // The revocation call failed — not a rejected session, which the library
    // treats as already signed out, but the network or a 500. It returns
    // *before* clearing local state when that happens, so the cookies are still
    // on the browser and the learner would be redirected to `/login` while
    // still holding a working session: signed out on screen, signed in in fact.
    //
    // So they are cleared here. This is the one place that has to know the
    // library's cookie prefix, and it is worth the coupling: the alternative is
    // showing the learner a failure they cannot act on, on the one control
    // whose entire purpose is to leave.
    logger.warn({ err: error }, 'the session could not be revoked; clearing the cookies anyway');

    const store = await cookies();

    for (const cookie of store.getAll()) {
      if (cookie.name.startsWith(SESSION_COOKIE_PREFIX)) {
        store.delete(cookie.name);
      }
    }
  }

  // 303, so the browser continues with GET and a refresh cannot re-post.
  return NextResponse.redirect(new URL('/login', publicEnv.NEXT_PUBLIC_APP_URL), 303);
}
