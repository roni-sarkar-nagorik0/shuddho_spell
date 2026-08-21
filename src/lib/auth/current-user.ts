import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { type IAuthenticatedUser } from '@/contracts';
import { createSessionClient } from '../supabase/session-client';
import { MissingProfileError } from './missing-profile-error';

const profileSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

/**
 * Exported for `SessionBoundary` and nothing else — it is the only caller that
 * needs the nullable answer, because "nobody is signed in" is a page it still
 * has to render. Every other caller wants `requireUser()`; reaching for this
 * one instead is how a page ends up deciding for itself what to do about an
 * anonymous visitor, which is exactly what the three-ways rule prevents.
 *
 * **Memoised per request with React's `cache`.** Every protected page calls it
 * three times over — once in `SessionBoundary`, once in the layout, once in the
 * page — and each call was two round trips to Supabase in Seoul: `getUser()`
 * against the auth server, then the profile row. Six trips for one answer that
 * cannot change inside a single render. `cache` collapses them to two. It is
 * request-scoped, so nothing leaks between learners, and it is deliberately not
 * `unstable_cache`: a session is exactly the thing that must not be shared.
 */
export const readUser = cache(async (): Promise<IAuthenticatedUser | null> => {
  const supabase = await createSessionClient();

  // getUser(), not getSession(): the second one trusts whatever cookie arrived.
  const { data, error } = await supabase.auth.getUser();
  if (error !== null) {
    // `UserResponse` is discriminated on `error`, so this one check is also
    // what tells TypeScript the user below is present.
    return null;
  }

  const { email, id: userId } = data.user;
  if (email === undefined) {
    // Google always supplies one, so a session without it is not a learner.
    return null;
  }

  const { data: row, error: profileError } = await supabase
    .from('learner_profiles')
    .select('id, display_name')
    .eq('user_id', userId)
    .maybeSingle();

  const profile = profileSchema.safeParse(row);
  if (profileError !== null || !profile.success) {
    throw new MissingProfileError(userId);
  }

  return {
    userId,
    profileId: profile.data.id,
    email,
    displayName: profile.data.display_name,
  };
});

/**
 * The Server Component way in. Returns the learner, or redirects to `/login`.
 *
 * The middleware already turns an anonymous request for a protected page into
 * that same redirect, so in practice this is the belt: it covers a page reached
 * by a path the matcher does not run on, and — the everyday reason — it is what
 * hands the page a typed learner instead of a cookie.
 */
export async function requireUser(): Promise<IAuthenticatedUser> {
  const user = await readUser();

  if (user === null) {
    redirect('/login');
  }

  return user;
}
