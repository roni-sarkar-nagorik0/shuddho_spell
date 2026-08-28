# 11 — API surface

The API lives in the **same Next.js app** as the UI, under `src/app/api/`. Route files are
three-line re-exports; the handlers live in each module's `presentation/handlers/`.

## Envelope

```ts
export interface IApiResponse<T> {
  readonly data: T;
  readonly meta?: IApiMeta;
}
```

Errors are **RFC 7807 `application/problem+json`** with a stable machine-readable `code`:

```json
{
  "type": "https://shuddhospell.app/problems/exam-time-expired",
  "title": "Exam time expired",
  "status": 409,
  "code": "EXAM_TIME_EXPIRED",
  "detail": "The attempt deadline passed at 2026-03-04T11:02:00Z.",
  "instance": "/api/v1/exams/attempts/…/answers"
}
```

The `code` is the contract. Clients branch on `code`, never on `detail` or on the status
alone. Codes are declared in `src/contracts` as a frozen const union.

## Routes — all under `/api/v1`

| Module | Routes |
| --- | --- |
| `auth` | `GET /me` · `GET /onboarding` · `POST /onboarding` |
| `admin` | `GET /admin/users` · `PATCH /admin/users/:id/role` — both 403 for a non-admin |
| `program` | `GET /program` · `GET /program/days/:dayIndex` |
| `lessons` | `POST /lessons/sessions` · `PATCH /lessons/sessions/:id/stage` · `POST /lessons/sessions/:id/attempts` · `POST /lessons/sessions/:id/complete` |
| `review` | `GET /review/due` · `POST /review/attempts` |
| `exams` | `POST /exams/:code/attempts` · `GET /exams/:code/readiness` · `GET /exams/attempts/active` · `PATCH /exams/attempts/:id/answers` · `POST /exams/attempts/:id/sections/:code/submit` · `POST /exams/attempts/:id/submit` · `GET /exams/attempts/:id/result` · `GET /exams/attempts/:id/review` |
| `progress` | `GET /progress/summary` · `GET /progress/mastery` |
| `library` | `GET /library` (paginated, filtered, sorted) · `GET /library/families` |
| `demo` | `GET /demo/word` · `POST /demo/speech` · `POST /demo/attempts` — the landing-page drill |
| `notifications` | `GET /notifications` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `GET/PUT /notifications/preferences` · `POST /notifications/push/subscribe` · `POST /notifications/push/unsubscribe` |
| `certificates` | `GET /certificates/verify/:code` |

**There is no `GET /exams` and no `GET /exams/:code`.** The catalogue and the lobby are read
screens: the Server Component calls `GetExamCatalogue` through the composition root, and no
client polls either of them. The same is true of the exam milestones, the weak-spot list, the
practice queue, the grammar syllabus and a grammar day — use cases with a screen and no route.
A handler exists when something on the client calls it, not for symmetry.

Likewise `GET /progress/timeline` does not exist; the timeline is part of
`GetProgressSummary`.

Plus internal, non-public:

| Path | Purpose |
| --- | --- |
| `/api/cron/exam-autosubmit` | backstop for `pg_cron`; auto-submits abandoned attempts. `GET` and `POST`, `maxDuration = 60` |
| `/api/cron/notifications` | timezone-aware dispatch. `GET` and `POST`, `maxDuration = 60` |
| `/api/health` · `/api/ready` | liveness and readiness, both public |
| `/api/metrics` | counters and timings, behind `withCron`'s bearer secret — not public |
| `/api/v1/openapi.json` | generated from the Zod schemas |

Vercel Cron calls both jobs **daily** (`vercel.json`), not hourly — see `09-notifications.md`
for what that costs and why. There is no `/api/cron/weekly-reports`: `SendWeeklyReportUseCase`
exists and is tested, but nothing schedules it yet.

Cron routes are built by **`withCron`**, not `withApi`: they have no session, they
authenticate with `Bearer ${CRON_SECRET}` compared in constant time, and they return a plain
job summary rather than the learner envelope.

## `withApi` — the one wrapper

Every handler is built by it. It owns session resolution, Zod parsing, rate limiting, request
ids, logging, and error → problem+json mapping. See `01-architecture.md`.

Declared per route:

```ts
withApi({
  auth: 'required' | 'public',
  rateLimit: { key, limit, windowSeconds },
  body / query / params: <Zod schema>,
  handler: async ({ user, body, query, params, container }) => …,
})
```

Nothing reaches a handler unvalidated, and no handler resolves its own session.

## Cross-cutting rules

- **Cursor-based pagination everywhere.** No offset pagination, not even on
  `/library` — it breaks under concurrent writes and degrades with depth.
- **Rate limits on every write route**, through `IRateLimiter`. Default implementation is
  Postgres-backed so it needs no extra infrastructure; Upstash Redis swaps in behind the same
  port. Exam answer saving gets a higher ceiling — a learner typing fast is not an attacker.
- **`GET /certificates/verify/:code` is the only public business route.** A certificate is
  worthless if an employer needs an account to check it. It answers from the
  `certificate_verifications` view — name, track, score, issue date, revocation, and nothing
  else — and a revoked certificate verifies **as revoked**, not as missing.
- **`export const runtime = 'nodejs'`** on every handler touching the database.
  **`export const dynamic = 'force-dynamic'`** on every exam and lesson handler — a cached
  exam response is a correctness bug.
- Every response is typed from `src/contracts`, and the client re-validates it and throws a
  typed `ApiError` on mismatch. Both sides. A drifting contract should fail loudly in
  development, not silently render `undefined`.
- OpenAPI is **generated from the same Zod schemas** (`zod-to-openapi`) and served at
  `/api/v1/openapi.json`. It is documentation, not a second source of truth.

## Server Components read directly

A read screen does **not** fetch its own API over HTTP. A Server Component calls the same use
case through the composition root — no network hop, no serialisation, no double validation.

The route handler exists for the client: TanStack Query, optimistic updates, polling, and any
future non-web client. Both paths run the same use case. Never two implementations.

## Response shape discipline

`GET /exams/attempts/:id/review` returns correct answers. **Every other exam route must not**,
before submission — including `GET /exams/attempts/:id/result`, which carries the score and
the by-section breakdown but not the paper. See `08-exam-engine.md` rule 3 and its snapshot
test.

## Health

`/api/health` — liveness, no dependencies checked.
`/api/ready` — readiness, checks Supabase connectivity. Both public.
