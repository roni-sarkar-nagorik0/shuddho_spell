# 04 — Authentication (Google only)

One provider. One button. No alternatives, now or later.

## Absolute constraints

- Supabase Auth with **only** the Google provider enabled.
- No email/password. No magic link. No OTP. No second provider.
- **No email input field exists anywhere in the codebase.** A grep for `password`,
  `magic.link` or `signInWithOtp` in `apps/` must return nothing in application code.
- The sign-in screen is one heading, one line of copy, one Google button.

## Web flow (`apps/web`)

1. `/login` calls `supabase.auth.signInWithOAuth({ provider: 'google' })` with a redirect
   to `/auth/callback`.
2. `/auth/callback` is a route handler that exchanges the code for a session using
   `@supabase/ssr` and stores it in **httpOnly cookies**.
3. It then redirects to `/onboarding` for a brand-new profile, or `/dashboard` for an
   existing one.
4. Middleware refreshes the session and protects every route except `/`, `/login`,
   `/auth/*` and the public marketing pages.
5. `useSession()` returns a typed `ISessionUser` in Client Components.
   `requireUser()` is the server-side helper for Server Components.

## API flow (`apps/api`)

**The API never performs the OAuth dance.** It only verifies the Supabase JWT.

`SupabaseJwtGuard`:

- verifies the RS256 token against the Supabase project's JWKS endpoint using `jose`
- caches the keys with a TTL (do not fetch JWKS per request)
- validates `iss`, `aud` and `exp`
- attaches a typed `IAuthenticatedUser` to the request
- rejects with `problem+json` 401 carrying a stable machine-readable `code`

The request type is augmented in a `.d.ts`:

```ts
declare global {
  namespace Express {
    interface Request {
      readonly user?: IAuthenticatedUser;
    }
  }
}
```

**No `any` on the request. No `as`.** If you find yourself casting, the `.d.ts` is wrong.

## Guards and decorators

- The guard is registered globally with `APP_GUARD`. Routes are **protected by default,
  public by exception.**
- `@Public()` opts a route out. Used by `/health`, `/ready`, `/docs` and certificate
  verification only.
- `@CurrentUser()` is a param decorator returning `IAuthenticatedUser`.

## Identity

Identity comes from the **verified token, always**. Never from a body field, a query param,
a header, or a client-supplied `profileId`. Any use case input containing a user id that
did not come from `@CurrentUser()` is a security bug.

## Profile bootstrap

`BootstrapProfileUseCase` upserts `public.learner_profiles` keyed by `auth.users.id` on the
first authenticated request. It is **idempotent** — concurrent first requests must not
produce two profiles or a 500. The database trigger from Phase 2 is the primary path; this
use case is the reconciler.

`GET /api/v1/me` returns the profile plus the learner's program position.

## Required tests

| Case | Expected |
| --- | --- |
| expired token | 401, stable code |
| wrong audience | 401 |
| wrong issuer | 401 |
| malformed token | 401 |
| missing token | 401 |
| valid token on protected route | 200 |
| no token on `@Public()` route | 200 |
| JWKS fetch failure | 503, not 200 |
