import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextRequest, type NextResponse } from 'next/server';
import { publicEnv } from '../env.public';
import { toSessionCookieOptions } from './session-cookie-options';

interface ICookieToSet {
  readonly name: string;
  readonly value: string;
  readonly options: CookieOptions;
}

interface ICookieAdapter {
  readonly getAll: () => readonly { readonly name: string; readonly value: string }[];
  readonly setAll: (cookies: readonly ICookieToSet[]) => void;
}

/**
 * One session client, two transports. The client itself never varies — anon
 * key, RLS applies — but where its cookies live does: a Server Component or a
 * route handler reaches the store through `next/headers`, and middleware runs
 * before that store exists and has to read the request and write the response
 * directly. Both go through here so neither can drift from the other, and in
 * particular so neither can skip `toSessionCookieOptions`.
 */
function build(cookieAdapter: ICookieAdapter) {
  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return [...cookieAdapter.getAll()];
        },
        setAll(cookiesToSet) {
          cookieAdapter.setAll(
            cookiesToSet.map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
              options: toSessionCookieOptions(cookie.options),
            })),
          );
        },
      },
    },
  );
}

/**
 * The learner's own client — anon key, RLS applies. One of exactly two
 * `createClient` call sites in the codebase.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();

  return build({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      for (const { name, value, options } of cookiesToSet) {
        cookieStore.set(name, value, options);
      }
    },
  });
}

/**
 * The same client, for middleware. There is no `next/headers` store there, so a
 * refreshed session is written straight onto the outgoing response — and back
 * onto the request, so anything downstream in this same pass reads the new
 * token rather than the expired one it arrived with.
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return build({
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      for (const { name, value, options } of cookiesToSet) {
        request.cookies.set(name, value);
        response.cookies.set(name, value, options);
      }
    },
  });
}
