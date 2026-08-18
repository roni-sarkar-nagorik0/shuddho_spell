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
| reading `src/lib/env.ts` to see what the schema requires | writing or editing `.env.local` |

`.claude/settings.json` denies these at the tool level, so a slip is blocked rather than
caught in review.

**Why.** Secrets that enter a conversation are in the transcript, and a transcript is not a
vault. Nothing about this project needs Claude to see a real key: the schema in
`src/lib/env.ts` says which variables are required, and the Zod boot validation names the
offending variable when one is missing or malformed. That is the supported way to diagnose an
env problem. Reading the file adds nothing and costs containment.

If a task appears to require reading a secret, the task is wrong. Say so and stop.

## The contract

- `.env.example` is **committed** and always complete. Adding a variable without adding it
  there is a bug.
- `.env.local` holds real values, is **owned by the user**, is **never read or written by
  Claude**, and is **never committed** (`.gitignore` covers it).
- Every variable is validated by **Zod at boot** in `src/lib/env.ts`. A missing or malformed
  value **stops the app from starting** and prints exactly which variable is wrong.
- Nothing reads `process.env` directly except `src/lib/env.ts`. Everything else imports the
  parsed, typed `env` object. Grep enforces this.

```ts
// src/lib/env.ts
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  CRON_SECRET: z.string().min(32),
  // …
});

export const env = serverEnvSchema.parse(process.env);   // throws, loudly, at boot
```

Split the schema in two: `serverEnvSchema` and `publicEnvSchema`. The server module carries
`import 'server-only'` so importing a secret into a Client Component is a **build failure**,
not a runtime leak.

## Public vs secret

`NEXT_PUBLIC_*` is compiled into the browser bundle. Everything else is server-only.

| Public — safe in the browser | Secret — server only |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `SUPABASE_SERVICE_ROLE_KEY` |
| `NEXT_PUBLIC_SUPABASE_URL` | `DATABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `VAPID_PRIVATE_KEY` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `RESEND_API_KEY` |
| `NEXT_PUBLIC_SENTRY_DSN` | `CRON_SECRET` |
| `NEXT_PUBLIC_ENABLE_AUDIO_STORAGE` | `GOOGLE_CLIENT_SECRET`, `SENTRY_AUTH_TOKEN` |

The anon key **is** meant to be public — it is gated by Row Level Security. That is exactly
why RLS is written as if the API did not exist (`03-database.md`).

The service role key bypasses every policy. It appears in exactly three places: repository
implementations, the content seed CLI, and cron handlers. Never in a response, never in a
log, never in a client bundle. Phase 13 verifies this against the built bundle.

## Minimum to run

Sections 1 and 2 of `.env.example` — `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, the three Supabase
values and `DATABASE_URL`. Everything else is needed from the phase noted in that file.

## Local Supabase

`supabase start` prints the URL, anon key and service role key. The local defaults are:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Keys that must stay stable

- **VAPID pair.** Regenerating it silently kills push for every learner with an existing
  subscription. Generate once (`npx web-push generate-vapid-keys`), store it, do not rotate
  casually.
- **`CRON_SECRET`.** Rotating it means updating the scheduler in the same deploy, or jobs
  start 401-ing. Generate with `openssl rand -base64 32`.

## Adding a variable — the checklist

1. Add it to `.env.example` with a comment: what it is, where to get it, which phase needs it.
2. Add it to the correct half of the Zod schema in `src/lib/env.ts`.
3. If it is secret, confirm it is **not** `NEXT_PUBLIC_*` and that its module is
   `server-only`.
4. Add it to the deployment environment.
5. Never add a fallback default for a secret. A missing secret must fail the boot, not
   silently run in a degraded mode.
