# 11 — API surface

Everything under `/api/v1`.

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

The `code` is the contract. Clients branch on `code`, never on `detail` or on the HTTP status
alone. Codes are declared in `packages/contracts` as a frozen const union.

## Routes

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

## Cross-cutting rules

- **Pagination is cursor-based everywhere.** No offset pagination, not even on
  `/library/words`. Offset pagination breaks under concurrent writes and gets slower the
  deeper you go.
- **Write routes are rate limited** with `@nestjs/throttler`. Exam answer saves get a higher
  ceiling than everything else — a learner typing fast is not an attacker.
- **`GET /certificates/:id/verify` is the only `@Public()` business route.** A certificate is
  worthless if a prospective employer needs an account to check it.
- Every request body, query and param is Zod-parsed by the global pipe. Nothing reaches a
  controller unvalidated.
- Every response is typed from `packages/contracts`, and the web client re-validates it and
  throws a typed `ApiError` on mismatch. Yes, both sides. A drifting API contract should fail
  loudly in development, not silently render `undefined`.
- Swagger at `/docs`, generated from the same schemas. It is documentation, not a second
  source of truth.

## Response shape discipline

`GET /exams/attempts/:id/review` returns correct answers. **Every other exam route must
not**, before submission. See `08-exam-engine.md` rule 3 and its snapshot test.

## Health

`/health` — liveness, no dependencies checked.
`/ready` — readiness, checks Supabase connectivity. Both `@Public()`.
