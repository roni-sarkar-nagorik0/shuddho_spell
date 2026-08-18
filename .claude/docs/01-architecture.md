# 01 — Architecture

**One Next.js application. No separate backend project.** The App Router serves the UI *and*
the API. There is no NestJS app, no second deploy target, no second `package.json`.

Clean Architecture still applies in full, and is **enforced by lint, not by review**.

## Layer dependency rule

```
        ┌───────────────────────────────┐
        │ src/app  (routes + handlers)  │  thin. re-exports and page composition.
        └──────────────┬────────────────┘
                       │
        ┌──────────────▼────────────────┐
        │        presentation           │  HTTP handlers, Zod request/response DTOs
        └──────────────┬────────────────┘
                       │ imports application + contracts
        ┌──────────────▼────────┐   ┌────────────────┐
        │      application      │◄──│ infrastructure │
        └──────────────┬────────┘   └────────┬───────┘
                       │ imports domain      │ imports domain + application
        ┌──────────────▼─────────────────────▼───────┐
        │                  domain                    │  imports NOTHING
        └────────────────────────────────────────────┘
```

| Layer | May import |
| --- | --- |
| `domain` | itself only |
| `application` | `domain` |
| `infrastructure` | `domain`, `application` |
| `presentation` | `application`, `src/contracts` |
| `src/app` | `presentation`, `src/contracts`, `src/components` — **never** `domain` or `infrastructure` |

Enforced by `eslint-plugin-boundaries`. A violation is a **lint error**.

> **Never loosen the rule to make an import pass.** If `application` needs something from
> `infrastructure`, define a port in `application/ports`, implement it in
> `infrastructure/adapters`, wire it in the composition root. Every time. No exceptions.

## Folder structure

```
src/
  app/                               Next.js App Router
    (marketing)/                     public pages — /, pricing, faq
    (learn)/                         authenticated app — dashboard, lesson, exams …
    auth/callback/route.ts           OAuth code exchange
    api/
      v1/<feature>/route.ts          3-line re-export of the module's handler
      cron/<job>/route.ts            scheduled jobs, guarded by CRON_SECRET
    layout.tsx  globals.css
  modules/<feature>/
    domain/
      entities/                      pure TS. No Next, no Supabase, no HTTP, no Zod.
      value-objects/
      events/
      repositories/                  PORT interfaces only
      services/                      rules spanning entities
      errors/                        typed domain errors, never generic Error
    application/
      use-cases/                     ONE class, ONE public execute()
      ports/                         IClock, ISpeechScorer, IMailer, IPushSender,
                                     IIdGenerator, IUnitOfWork, IRateLimiter
      dto/                           input/output interfaces
      mappers/                       domain <-> dto
    infrastructure/
      persistence/supabase/          one repository impl per port
      adapters/                      one impl per application port
      mappers/                       db row <-> domain entity
    presentation/
      handlers/                      route handler factories — thin
      dto/                           Zod schemas + request/response types
  contracts/                         interfaces + Zod schemas shared by server and client
  composition/                       the composition root — wires ports to implementations
  components/                        design system + feature components
  lib/                               env, supabase clients, logger, api wrapper, i18n
supabase/migrations/                 plain SQL, numbered, forward-only
content/                             typed course content, one file per week
```

`src/app/api/v1/lessons/sessions/route.ts` is genuinely three lines:

```ts
import { createSessionHandler } from '@/modules/lessons/presentation/handlers/create-session';

export const POST = createSessionHandler;
export const runtime = 'nodejs';
```

All the work is in the module. The `app/` tree stays a routing table.

## Dependency injection — the composition root

There is no Nest DI container. Wiring is **explicit, typed and in one place**:
`src/composition/`.

Ports still declare a `Symbol` token beside their interface, and the container maps token →
implementation:

```ts
export const WORD_REPOSITORY = Symbol('WORD_REPOSITORY');

export interface IWordRepository {
  readonly findById: (id: string) => Promise<Word | null>;
  readonly findByDay: (dayIndex: number) => Promise<readonly Word[]>;
}
```

```ts
// src/composition/container.ts
export function createContainer(deps: IContainerDeps): IContainer { /* … */ }

// src/composition/use-cases.ts — one factory per use case
export function makeSubmitDictationAttempt(c: IContainer): SubmitDictationAttemptUseCase {
  return new SubmitDictationAttemptUseCase(c.attempts, c.clock);
}
```

Rules:

- A use case receives its dependencies **as interfaces, through its constructor**. It never
  reaches into the container, never imports a concrete class, never imports `@/lib/supabase`.
- The container is constructed **per request** in a route handler, never as a module-level
  singleton holding request state.
- The test for whether you got this right: a use case must be unit-testable by calling
  `new SubmitDictationAttemptUseCase(fakeRepo, fakeClock)` — nothing else.

## The use case shape — every single one

```ts
export interface ISubmitDictationAttemptInput {
  readonly sessionId: string;
  readonly wordId: string;
  readonly submittedValue: string;
  readonly latencyMs: number;
}

export interface ISubmitDictationAttemptOutput {
  readonly isCorrect: boolean;
  readonly errorTags: readonly ErrorTag[];
  readonly correctSpelling: string;
}

export class SubmitDictationAttemptUseCase {
  constructor(
    private readonly attempts: IAttemptRepository,
    private readonly clock: IClock,
  ) {}

  async execute(
    input: ISubmitDictationAttemptInput,
  ): Promise<ISubmitDictationAttemptOutput> { /* … */ }
}
```

Plain classes. **No decorators anywhere.**

**A use case never takes** a `Request`, a `NextRequest`, a `Response`, a Supabase client, a
raw DB row, or a Zod schema. It never reads `process.env`. It never calls `Date.now()` — it
injects `IClock`.

## Route handlers

Every API handler is built by one wrapper, `withApi`, which replaces what Nest's global pipe,
guard and filter used to do:

```ts
export const POST = withApi({
  auth: 'required',                       // or 'public'
  rateLimit: { key: 'lesson-attempt', limit: 60, windowSeconds: 60 },
  body: submitAttemptRequestSchema,       // Zod — parsed before the handler runs
  handler: async ({ user, body, container }) => {
    const useCase = makeSubmitDictationAttempt(container);
    const result = await useCase.execute({ ...body, profileId: user.profileId });
    return ok(toAttemptResponse(result));
  },
});
```

`withApi` owns, in one place:

- session resolution and 401 on a missing or invalid session
- Zod parsing of body, query and params → 400 problem+json on failure
- rate limiting via `IRateLimiter`
- the request id and the structured log line
- catching typed domain errors and mapping them to RFC 7807 `application/problem+json`

A handler that contains a business conditional is a bug. A handler that calls two use cases
is a missing use case.

## Server Components and Server Actions

- **Server Components** may call a use case directly through the composition root for reads.
  They must not duplicate handler logic — the same use case serves both paths.
- **Server Actions** are allowed for simple form mutations (onboarding, preferences).
  They go through `withAction`, the same wrapper contract as `withApi`.
- **Anything a client polls, retries, or calls optimistically is a route handler**, not an
  action — exam answer saving, attempt submission, review submission. Actions have no useful
  status codes and no cache semantics.

## Ports you will need

| Token | Interface | Implemented in |
| --- | --- | --- |
| `CLOCK` | `IClock` | `infrastructure/adapters/system-clock` |
| `ID_GENERATOR` | `IIdGenerator` | `infrastructure/adapters/uuid-generator` |
| `UNIT_OF_WORK` | `IUnitOfWork` | Postgres function wrapper |
| `RATE_LIMITER` | `IRateLimiter` | Postgres-backed; Upstash Redis optional swap |
| `SPEECH_SCORER` | `ISpeechScorer` | phase 6 blend scorer |
| `PUSH_SENDER` | `IPushSender` | web-push / VAPID |
| `MAILER` | `IMailer` | Resend |
| `IN_APP_NOTIFIER` | `IInAppNotifier` | notification row writer |
| `*_REPOSITORY` | one per aggregate | `infrastructure/persistence/supabase` |

`IClock` exists so streaks, exam deadlines and spaced repetition are testable at a fixed
instant. Nothing in `domain` or `application` may read the system clock directly.

## Runtime

- Every route handler that touches the database or a Node library declares
  `export const runtime = 'nodejs'`. **Not edge** — `pg`, `web-push` and pino need Node.
- Exam and lesson handlers additionally declare `export const dynamic = 'force-dynamic'`.
  A cached exam response is a correctness bug, not a performance win.

## Scheduled work

There is no long-running server process, so there is no in-process scheduler.

| Job | Mechanism |
| --- | --- |
| exam auto-submit for abandoned attempts | `pg_cron` calling a Postgres function — the safety net that must work even if the app is down |
| hourly notification dispatch | `/api/cron/notifications`, called by Vercel Cron |
| weekly reports | `/api/cron/weekly-reports`, called by Vercel Cron |

Every `/api/cron/*` handler rejects any request whose `Authorization` header is not
`Bearer ${CRON_SECRET}`, and is idempotent — a double-fire must not double-send.

## Errors

- Expected domain failures → `IResult<T, E>` returned, not thrown.
- Typed exceptions are thrown **only at the application boundary**.
- `withApi` maps them to RFC 7807 `application/problem+json` with a stable
  machine-readable `code`.
- Postgres error codes are mapped in infrastructure: `23505` → unique violation,
  `23503` → foreign key, `40001` → serialization failure (retry once, then surface).

## Transactions

Where a use case must write several tables atomically — completing a session writes attempts,
review items, mastery records and the streak — push the multi-write into a Postgres function
and call it through `IUnitOfWork`. **Do not fake atomicity in TypeScript.** This matters more
on serverless than it did with a persistent server: a function invocation can die mid-way at
any point.

## What the single-app choice costs

Recorded honestly, so nobody rediscovers it under pressure:

- **No DI container.** Wiring is manual. The composition root must stay disciplined or it
  becomes a god module.
- **No long-running process.** Schedulers move to cron routes and `pg_cron`; in-memory caches
  (JWKS, rate limit buckets) do not survive between invocations, so they go to Postgres.
- **Cold starts** on serverless affect p95. Keep handler import graphs small — this is
  another reason `app/` files stay three lines.
- **One deploy unit.** A frontend change and an API change ship together. Simpler, but there
  is no independent rollback of the API.

The gain: one language, one build, one deploy, one type graph end to end, and no network hop
between the UI and its use cases.
