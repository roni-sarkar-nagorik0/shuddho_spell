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
| `auth` | `GET /me` · `POST /me/bootstrap` |
| `program` | `GET /program` · `GET /program/days/:dayIndex` |
| `lessons` | `POST /lessons/sessions` · `PATCH /lessons/sessions/:id/stage` · `POST /lessons/sessions/:id/attempts` |
| `review` | `GET /review/due` · `POST /review/attempts` |
| `exams` | `GET /exams` · `GET /exams/:code` · `POST /exams/:code/attempts` · `GET /exams/attempts/active` · `PATCH /exams/attempts/:id/answers` · `POST /exams/attempts/:id/sections/:code/submit` · `POST /exams/attempts/:id/submit` · `GET /exams/attempts/:id/review` |
| `progress` | `GET /progress/summary` · `GET /progress/mastery` · `GET /progress/timeline` |
| `library` | `GET /library/words` (paginated, filtered, sorted) |
| `notifications` | `GET /notifications` · `PATCH /notifications/:id/read` · `GET/PUT /notifications/preferences` · `POST /notifications/push/subscribe` |
| `certificates` | `GET /certificates/:id` · `GET /certificates/:id/verify` |

Plus internal, non-public:

| Path | Purpose |
| --- | --- |
| `/api/cron/exam-autosubmit` | backstop for `pg_cron`; auto-submits abandoned attempts |
| `/api/cron/notifications` | hourly, timezone-aware dispatch |
| `/api/cron/weekly-reports` | weekly report send |
| `/api/health` · `/api/ready` | liveness and readiness, both public |
| `/api/v1/openapi.json` | generated from the Zod schemas |

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
  `/library/words` — it breaks under concurrent writes and degrades with depth.
- **Rate limits on every write route**, through `IRateLimiter`. Default implementation is
  Postgres-backed so it needs no extra infrastructure; Upstash Redis swaps in behind the same
  port. Exam answer saving gets a higher ceiling — a learner typing fast is not an attacker.
- **`GET /certificates/:id/verify` is the only public business route.** A certificate is
  worthless if an employer needs an account to check it.
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
before submission. See `08-exam-engine.md` rule 3 and its snapshot test.

## Health

`/api/health` — liveness, no dependencies checked.
`/api/ready` — readiness, checks Supabase connectivity. Both public.
