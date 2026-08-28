# 16 — Environment and configuration

Every variable is declared in `.env.example` with a comment saying what it is, where to get
it, and which phase first needs it. That file is the reference; this doc is the rules.

## The `.env` rule — read this before anything else

**Claude never reads, opens, prints, edits, writes or moves `.env`, `.env.local` or any
`.env.*` file.** The only permitted interaction is checking that it exists:

```bash
ls -la .env.local
```

And the precondition: **if `.env.local` does not exist, no work starts.** Not scaffolding,
not "the parts that don't need it". Claude stops and asks the user to create it from
`.env.example`.

| Allowed | Never |
| --- | --- |
| `ls -la .env.local` — existence only | `cat` / `head` / `grep` / Read on any `.env*` |
| reading and editing `.env.example` (placeholders only) | echoing or pasting a real value |
| reading `src/lib/env.server.ts` / `env.public.ts` for what the schema requires | writing or editing `.env.local` |

`.claude/settings.json` denies these at the tool level, so a slip is blocked rather than
caught in review.

**Why.** Secrets that enter a conversation are in the transcript, and a transcript is not a
vault. Nothing about this project needs Claude to see a real key: the schema in
`src/lib/env.server.ts` says which variables are required, and the Zod boot validation names the
offending variable when one is missing or malformed. That is the supported way to diagnose an
env problem. Reading the file adds nothing and costs containment.

If a task appears to require reading a secret, the task is wrong. Say so and stop.

## The contract

- `.env.example` is **committed** and always complete. Adding a variable without adding it
  there is a bug.
- `.env.local` holds real values, is **owned by the user**, is **never read or written by
  Claude**, and is **never committed** (`.gitignore` covers it).
- Every variable is validated by **Zod at boot**. A missing or malformed value **stops the
  app from starting** and prints exactly which variable is wrong.
- Nothing reads `process.env` directly except the two env modules. Everything else imports the
  parsed, typed object. Grep enforces this.
- **The split is two files, not one export.** `src/lib/env.public.ts` holds `publicEnv`;
  `src/lib/env.server.ts` holds the secrets and carries `import 'server-only'`. One file with
  two exports would compile, and importing the wrong export into a Client Component would be
  a runtime leak instead of a build failure — the file boundary is what makes it fail.

```ts
// src/lib/env.server.ts — 'server-only'
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string().min(32),
  // …
});

export const serverEnv = serverEnvSchema.parse(process.env);   // throws, loudly, at boot
```

## Public vs secret

`NEXT_PUBLIC_*` is compiled into the browser bundle. Everything else is server-only.

| Public — safe in the browser | Secret — server only |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `SUPABASE_SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_SUPABASE_URL` | `DATABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `VAPID_PRIVATE_KEY` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | *(no mail key — no email is sent)* |
| `NEXT_PUBLIC_SENTRY_DSN` | `CRON_SECRET` |
| `NEXT_PUBLIC_ENABLE_AUDIO_STORAGE` | `VAPID_SUBJECT` |
| `NEXT_PUBLIC_AUTH_CALLBACK_URL` | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` |
| `NODE_ENV`, `LOG_LEVEL` | `GOOGLE_CLIENT_SECRET` |

`VAPID_SUBJECT` is a `mailto:` or `https:` contact required by the Web Push spec — a push
service uses it to reach you about a misbehaving sender, and `web-push` refuses to sign
without it. `SENTRY_ORG`, `SENTRY_PROJECT`, `SEED_CONTENT_ON_RESET` and the two
`UPSTASH_REDIS_REST_*` values are build- or tooling-time, not read by the running app.

The anon key **is** meant to be public — it is gated by Row Level Security. That is exactly
why RLS is written as if the API did not exist (`03-database.md`).

The service role key bypasses every policy. It appears in exactly three places: repository
implementations, the content seed CLI, and cron handlers. Never in a response, never in a
log, never in a client bundle. Phase 13 verifies this against the built bundle.

## Minimum to run

Sections 1 and 2 of `.env.example` — `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, the three Supabase
values and `DATABASE_URL`. Everything else is needed from the phase noted in that file.

## Supabase — hosted, no local stack

**There is no Docker and no local database.** Development runs against a hosted Supabase
project, the same way production does. Nothing to install, nothing to boot, no second set of
credentials to keep in sync.

Take the four values from the Supabase dashboard → Project Settings:

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API → Project API keys → `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | API → Project API keys → `service_role` |
| `DATABASE_URL` | Database → Connection string → URI |

Use a **separate Supabase project for development**, never the production one — migrations
and seeds are applied straight against whatever `DATABASE_URL` points at.

## Not used: email

The app sends no email. `RESEND_API_KEY` and `EMAIL_FROM` stay **commented out** in
`.env.example` and are **absent from the Zod schema** — adding them to the schema would make
the app refuse to boot over a feature that does not exist. Notifications run on in-app and
web push only. Email is a v2 decision. See `09-notifications.md`.

## Keys that must stay stable

- **VAPID pair.** Regenerating it silently kills push for every learner with an existing
  subscription. Generate once (`npx web-push generate-vapid-keys`), store it, do not rotate
  casually.
- **`CRON_SECRET`.** Rotating it means updating the scheduler in the same deploy, or jobs
  start 401-ing. Generate with `openssl rand -base64 32`.

## Adding a variable — the checklist

1. Add it to `.env.example` with a comment: what it is, where to get it, which phase needs it.
2. Add it to the right file — `src/lib/env.public.ts` for `NEXT_PUBLIC_*`, `src/lib/env.server.ts` for everything else.
3. If it is secret, confirm it is **not** `NEXT_PUBLIC_*` and that its module is
   `server-only`.
4. Add it to the deployment environment.
5. Never add a fallback default for a secret. A missing secret must fail the boot, not
   silently run in a degraded mode.
