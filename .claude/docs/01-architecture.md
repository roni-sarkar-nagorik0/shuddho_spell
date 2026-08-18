# 01 — Architecture

Clean Architecture, **enforced by lint, not by review**.

## Layer dependency rule

```
        ┌──────────────┐
        │ presentation │  controllers, modules, HTTP DTOs
        └──────┬───────┘
               │ imports application + contracts
        ┌──────▼───────┐        ┌────────────────┐
        │ application  │◄───────│ infrastructure │
        └──────┬───────┘        └────────┬───────┘
               │ imports domain          │ imports domain + application
        ┌──────▼──────────────────────────▼┐
        │              domain              │  imports NOTHING
        └──────────────────────────────────┘
```

| Layer | May import |
| --- | --- |
| `domain` | itself only |
| `application` | `domain` |
| `infrastructure` | `domain`, `application` |
| `presentation` | `application`, `packages/contracts` |

Enforced by `eslint-plugin-boundaries`. A violation is a **lint error**, not a review comment.

> **Never loosen the rule to make an import pass.** If `application` needs something from
> `infrastructure`, the answer is always: define a port in `application/ports`, implement it
> in `infrastructure/adapters`, bind it in the module. Every time. No exceptions.

## Folder shape — every feature module

```
apps/api/src/modules/<feature>/
  domain/
    entities/          pure TS. No Nest, no Supabase, no HTTP, no Zod.
    value-objects/
    events/
    repositories/      PORT interfaces only: IWordRepository, IExamRepository
    services/          rules that span entities
    errors/            typed domain errors, never generic Error
  application/
    use-cases/         ONE class, ONE public execute()
    ports/             outbound: IClock, ISpeechScorer, IMailer, IPushSender,
                       IIdGenerator, IUnitOfWork
    dto/               input/output shapes as interfaces
    mappers/           domain <-> dto
  infrastructure/
    persistence/supabase/   one repository impl per port
    adapters/               one impl per application port
    mappers/                db row <-> domain entity
  presentation/
    <feature>.controller.ts   thin
    <feature>.module.ts       binds tokens to implementations
    dto/                      Zod schemas + request/response types
```

## Dependency injection

Every port declares its token as a `Symbol` **beside the interface**, in the same file:

```ts
export const WORD_REPOSITORY = Symbol('WORD_REPOSITORY');

export interface IWordRepository {
  readonly findById: (id: string) => Promise<Word | null>;
  readonly findByDay: (dayIndex: number) => Promise<readonly Word[]>;
}
```

Modules bind token → implementation:

```ts
providers: [
  { provide: WORD_REPOSITORY, useClass: SupabaseWordRepository },
]
```

Use cases inject the **interface via the token**, never the concrete class. The test for
whether you got this right: a use case must be unit-testable with an in-memory fake and
**zero Nest `TestingModule`**.

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

@Injectable()
export class SubmitDictationAttemptUseCase {
  constructor(
    @Inject(ATTEMPT_REPOSITORY) private readonly attempts: IAttemptRepository,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async execute(
    input: ISubmitDictationAttemptInput,
  ): Promise<ISubmitDictationAttemptOutput> { /* … */ }
}
```

**A use case never takes** a `Request`, a `Response`, a Supabase client, a raw DB row, or a
Zod schema. It never reads `process.env`. It never calls `Date.now()` — it injects `IClock`.

## Controllers

```
parse with Zod → call exactly ONE use case → map to the contract interface → return
```

A controller that contains a business conditional is a bug. A controller that calls two use
cases is a missing use case.

## Ports you will need

| Token | Interface | Implemented in |
| --- | --- | --- |
| `CLOCK` | `IClock` | `infrastructure/adapters/system-clock` |
| `ID_GENERATOR` | `IIdGenerator` | `infrastructure/adapters/uuid-generator` |
| `UNIT_OF_WORK` | `IUnitOfWork` | Postgres function wrapper |
| `SPEECH_SCORER` | `ISpeechScorer` | phase 6 blend scorer |
| `PUSH_SENDER` | `IPushSender` | web-push / VAPID |
| `MAILER` | `IMailer` | Resend or Supabase SMTP |
| `IN_APP_NOTIFIER` | `IInAppNotifier` | notification row writer |
| `*_REPOSITORY` | one per aggregate | `infrastructure/persistence/supabase` |

`IClock` exists so that streaks, exam deadlines and spaced repetition are testable at a
fixed instant. Nothing in `domain` or `application` may read the system clock directly.

## Errors

- Expected domain failures → `IResult<T, E>` returned, not thrown.
- Typed exceptions are thrown **only at the application boundary**.
- One global exception filter maps them to RFC 7807 `application/problem+json` with a stable
  machine-readable `code`.
- Postgres error codes are mapped in infrastructure: `23505` → unique violation,
  `23503` → foreign key, `40001` → serialization failure (retry once, then surface).

## Transactions

Where a use case must write several tables atomically — completing a session writes
attempts, review items, mastery records and the streak — push the multi-write into a
Postgres function and call it through `IUnitOfWork`. **Do not fake atomicity in TypeScript.**
