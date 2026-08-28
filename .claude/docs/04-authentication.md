# 04 — Authentication (Google only)

One provider. One button. No alternatives, now or later.

Because the app and the API are the **same Next.js project**, auth is cookie-session based
end to end. There is no cross-origin JWT to verify and no bearer-token dance.

## Absolute constraints

- Supabase Auth with **only** the Google provider enabled.
- No email/password. No magic link. No OTP. No second provider.
- **No email input field exists anywhere in the codebase.** A grep for `password`,
  `magic.link` or `signInWithOtp` in `src/` must return nothing in application code.
- The sign-in screen is one heading, one line of copy, one Google button.

## The flow

1. `/login` calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with a redirect to
   `/auth/callback`.
2. `src/app/auth/callback/route.ts` exchanges the code for a session with `@supabase/ssr` and
   stores it in **httpOnly cookies**.
3. It redirects to `/onboarding` for a profile with no `onboarding_completed_at` (migration
   `011`), or `/dashboard` for one that has it. "The profile row exists" cannot decide it —
   the signup trigger writes that row before the learner has seen a screen.
4. **`src/proxy.ts`** refreshes the session on every request and protects every page the
   matcher reaches. Next 16 renamed the `middleware.ts` convention to `proxy.ts` and
   deprecates the old name; the behaviour is unchanged, and the rename was taken early
   rather than left to be forced by 17 (D24).

### What is public, and how the list is written

`proxy.ts` names the **public** pages and treats everything else the matcher reaches as
private. The direction matters: a page added tomorrow is private until someone writes it
down, not public until someone remembers to protect it.

```ts
const PUBLIC_PAGES = ['/', '/login', '/pricing', '/faq'];
const PUBLIC_PREFIXES = ['/auth/'];
```

That list is **missing `/verify/`**, and the consequence is real: the public certificate
verification page redirects a signed-out visitor to `/login`, which is the one thing it exists
not to do. The API route behind it is fine — `/api` is outside the matcher — so the fix is the
prefix, not the page. See `13-frontend.md`.

`/api` is deliberately **outside the matcher**. A `fetch('/api/v1/me')` answered with a
redirect to an HTML login page is a 200 full of markup instead of an error the caller can
branch on — the 401 is `withApi`'s job. `/api/v1/certificates/verify/:code` is public for the
same structural reason, and `/api/cron/*` authenticates with a bearer secret, not a session.

It runs on the **Edge** runtime, not Node: the Node runtime for this file is still an
experimental flag, and an experimental flag is a worse dependency than a understood build
warning (D24).

Google client ID and secret are configured in the **Supabase dashboard**
(Authentication → Providers → Google), not read by this app. The authorised redirect URI is
`https://<project>.supabase.co/auth/v1/callback`. See `.env.example` section 3.

## The three ways to read the user — and only three

| Context | Helper | Behaviour |
| --- | --- | --- |
| Server Component | `requireUser()` | returns `IAuthenticatedUser`, redirects to `/login` if absent |
| Route handler | `withApi({ auth: 'required' })` | injects `user` into the handler, 401 problem+json if absent |
| Client Component | `useSession()` | returns typed `ISessionUser \| null` |

Nothing else reads the session. No handler calls `supabase.auth.getUser()` inline, no
component reads the cookie directly.

```ts
export interface IAuthenticatedUser {
  readonly userId: string;      // auth.users.id — from the verified session, always
  readonly profileId: string;
  readonly email: string;
  readonly displayName: string;
}
```

## Identity

Identity comes from the **server-verified session, always**. Never from a body field, a query
param, a header, or a client-supplied `profileId`.

Any use case input carrying a user id that did not come from `withApi`'s `user` or
`requireUser()` is a security bug. The wrapper injects it; the client never sends it.

## Two Supabase clients, never more

| Client | Where | Key | Purpose |
| --- | --- | --- | --- |
| server session client | `lib/supabase/server.ts` | anon + cookies | reads as the user, **RLS applies** |
| service client | `lib/supabase/service.ts` | service role | repositories, cron, seed CLI — **bypasses RLS** |

- The service client is **server-only**. Importing it from a Client Component must fail the
  build — mark the module `import 'server-only'`.
- No other file in the codebase constructs a Supabase client. Grep proves it.
- The service role key bypassing RLS is not a reason for weak policies. RLS is written as if
  the API did not exist (see `03-database.md`).

## Profile bootstrap

A trigger on `auth.users` insert creates the `learner_profiles` row (Phase 2). The
`BootstrapProfileUseCase` is the **idempotent reconciler** on top of it, run on the first
authenticated request. Concurrent first requests must produce exactly one profile and no 500.

`GET /api/v1/me` returns the profile plus the learner's program position. There is **no
bootstrap endpoint** — `BootstrapProfileUseCase` runs inside the first authenticated read,
and an endpoint that creates or repairs a profile on demand would be a back door standing
open for the life of the product. It is also the only code that sees a verified session's
address on every sign-in, so it keeps `learner_profiles.email` current for the admin roster.

## Two roles

Migration `020` put `role` (`user` | `admin`) on `learner_profiles`. There is no second users
table: `learner_profiles` is already one row per signed-in user, created by a trigger.

- **The database makes the first admin.** `assign_first_admin` runs inside the insert, so the
  first account through the door is an admin and every account after it is a `user`.
- **Only an admin can make an admin.** `SetUserRoleUseCase` is the only path — no invite, no
  env var full of addresses, no bootstrap route.
- **The last admin cannot be demoted**, checked against a live count rather than against the
  roster the browser was showing. Demoting *yourself* is allowed while you are not the last.
- `/admin` renders a **404** for a non-admin, while `/api/v1/admin/*` answers **403**. A page
  that says "you are not allowed" for a URL a learner has no reason to know about is only
  advertising it; a client that asked deserves a straight answer. Neither is the protection —
  the use case reading the caller's role before it reads anything else is.

## Cron routes are not user routes

`/api/cron/*` has no user. It authenticates with a shared secret:

```ts
if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
  return problem(401, 'CRON_UNAUTHORISED');
}
```

Compare in constant time. Never log the secret. Never accept the secret in a query param —
query strings end up in access logs.

## Required tests

| Case | Expected |
| --- | --- |
| no session, protected page | redirect to `/login` |
| no session, protected route handler | 401 problem+json with a stable code |
| valid session, protected route | 200 |
| `auth: 'public'` route, no session | 200 |
| expired session cookie | refreshed by `proxy.ts`, or 401 — never a 500 |
| tampered session cookie | 401 |
| body containing `profileId` for another user | ignored; the session's profile is used |
| `/api/cron/*` without the bearer secret | 401 |
| service client imported from a Client Component | build failure |
| `grep -ri "password\|magic.link\|signInWithOtp" src/` | nothing in app code |
