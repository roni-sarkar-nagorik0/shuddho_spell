# ARCHITECTURE.md — ShuddhoSpell

The architecture record for the build. Written in Phase 0, kept alive after it.

`CLAUDE.md` holds the rules. `BUILD-ORDER-COMPLETE.md` holds the phase contract.
`PROGRESS.md` holds the live state. **This file holds the shape**: the layers, the folders,
the ports and their tokens, the database tables, and every decision taken that the
specification did not make for me.

Source of truth for everything below: `.claude/docs/00` … `16`. Where this file and a doc in
`.claude/docs/` disagree, the doc wins and this file is the bug.

---

## 1. Layer dependency diagram

**One Next.js application.** The App Router serves the UI *and* the API. There is no second
project, no second `package.json`, no second deploy target. Clean Architecture lives inside
`src/modules/<feature>/` and is enforced by `eslint-plugin-boundaries` — a violation is a
**lint error**, not a review comment.

```
┌──────────────────────────────────────────────────────────────────────┐
│  src/app        routes, pages, 3-line handler re-exports              │
│                 may import: presentation · contracts · components     │
│                 may NOT import: domain · infrastructure               │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  presentation   handler factories, Zod request/response DTOs          │
│                 may import: application · contracts                   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────┐   ┌───────────────────────┐
│  application    use cases, ports, DTOs,   │◄──│  infrastructure       │
│                 mappers                   │   │  supabase repos,      │
│                 may import: domain        │   │  port adapters,       │
│                                           │   │  row mappers          │
│                                           │   │  may import:          │
│                                           │   │  domain · application │
└───────────────────────────────┬───────────┘   └───────────┬───────────┘
                                │                           │
┌───────────────────────────────▼───────────────────────────▼──────────┐
│  domain         entities, value objects, domain services, repository  │
│                 PORT interfaces, typed errors, events                 │
│                 imports NOTHING — no Next, no Supabase, no Zod, no    │
│                 HTTP, no clock                                        │
└──────────────────────────────────────────────────────────────────────┘

  src/composition  the only place that knows both a port and its implementation.
                   Sits outside the module layers and may import all of them.
  src/shared       zero-dependency primitives (IResult). Importable by every zone.
```

| Zone | May import |
| --- | --- |
| `domain` | `domain` (own module), `shared` |
| `application` | `domain`, `shared` |
| `infrastructure` | `domain`, `application`, `shared`, `lib/supabase`, `lib/env` |
| `presentation` | `application`, `contracts`, `shared`, `lib` |
| `app` | `presentation`, `contracts`, `components`, `lib` |
| `composition` | all of the above — by design, and only here |

The rule that never bends: **if `application` needs something from `infrastructure`, define a
port in `application/ports` (or `domain/repositories`), implement it in
`infrastructure/adapters`, and wire it in `src/composition/`.** Never loosen the boundaries
config to make an import pass.

### Two paths, one implementation

- A **Server Component** calls a use case directly through the composition root. It never
  fetches its own API over HTTP.
- A **route handler** built by `withApi` calls the same use case for the client
  (TanStack Query, optimistic updates, polling).

Never two implementations of one read.

### Error flow

```
domain expected failure   → IResult<T, E> returned, never thrown
application boundary      → typed exception thrown
withApi / withAction      → RFC 7807 application/problem+json with a stable `code`
infrastructure PG codes   → 23505 unique · 23503 FK · 40001 serialization (retry once)
```

---

## 2. Folder tree

```
ShuddhoSpell/
  .claude/
    commands/                        /build, /next-feature, /phase-start, /phase-check,
                                     /ship, /layer-audit, /type-audit, /exam-attack,
                                     /content-gap
    docs/                            00 … 16 — the specification
    settings.json                    tool-level deny rules (.env* is denied here)
  ARCHITECTURE.md                    this file
  BUILD-ORDER-COMPLETE.md            the phase contract
  CLAUDE.md                          the rules
  PROGRESS.md                        the live feature tracker
  README.md
  .env.example                       committed, complete, placeholders only
  .env.local                         user-owned, never read, never committed
  package.json                       ONE package.json. No monorepo. No apps/.
  next.config.ts  tailwind.config.ts  tsconfig.json  eslint.config.js
  vitest.config.ts  playwright.config.ts  middleware.ts

  content/                           typed course content, Zod-validated at build time
    phonemes.ts                      44 entries
    rule-families.ts                 24 entries
    week-01.ts … week-04.ts          1,240 words · 560 sentence items

  supabase/
    config.toml
    migrations/                      plain SQL, numbered, forward-only, never edited
      001_extensions.sql
      002_content_tables.sql
      003_learner_tables.sql
      004_exam_tables.sql
      005_notification_tables.sql
      006_certificates.sql
      007_indexes.sql
      008_rls_policies.sql
      009_functions_triggers.sql
      010_seed_reference.sql
    tests/
      rls-two-user.sql               the two-user proof script (Phase 2, re-run Phase 13)

  scripts/
    check-architecture-doc.sh        F0.1's test: five sections + every port in the table
    content-seed.ts                  pnpm content:seed — validate → diff → apply

  e2e/                               Playwright specs
    sign-in.spec.ts  lesson-day-12.spec.ts  exam-milestone2.spec.ts  exam-failed.spec.ts

  src/
    app/                             Next.js App Router — a routing table, nothing more
      (marketing)/                   /  pricing  faq
      (learn)/                       dashboard  program  lesson/[day]  practice
                                     weak-spots  library  progress  exams  exams/[code]
                                     exams/attempt/[id]  exams/result/[id]
                                     exams/review/[id]  certificate/[id]  onboarding
      login/
      auth/callback/route.ts         OAuth code exchange
      api/
        v1/<feature>/route.ts        3-line re-export of the module's handler
        v1/openapi.json/route.ts     generated from the Zod schemas
        cron/<job>/route.ts          exam-autosubmit · notifications · weekly-reports
        health/route.ts  ready/route.ts
      layout.tsx  globals.css

    modules/<feature>/               auth · program · lessons · review · exams ·
                                     progress · library · notifications · certificates
      domain/
        entities/                    pure TS classes with behaviour
        value-objects/               DayIndex, ScorePercent, IpaTranscription, Track, ErrorTag
        events/
        repositories/                PORT interfaces + their Symbol tokens
        services/                    ReviewSchedulingPolicy, MasteryCalculator, ErrorTagger,
                                     ExamScoringService, ExamBlueprintService, NotificationPolicy
        errors/                      typed domain errors, never a generic Error
      application/
        use-cases/                   ONE class, ONE public execute(input): Promise<output>
        ports/                       IClock, IIdGenerator, ISpeechScorer, IUnitOfWork,
                                     IRateLimiter, IPushSender, IInAppNotifier
        dto/                         IXInput / IXOutput interfaces
        mappers/                     domain ↔ dto
      infrastructure/
        persistence/supabase/        one repository implementation per port
        adapters/                    one implementation per application port
        mappers/                     db row ↔ domain entity — the ONLY files that know snake_case
        rows/                        hand-written I*Row interfaces. Never leave this folder.
      presentation/
        handlers/                    thin route-handler factories built by withApi
        dto/                         Zod schemas + request/response types

    contracts/                       interfaces + Zod schemas shared by server and client
      api-response.ts                IApiResponse<T>
      problem-details.ts             IProblemDetails
      paginated-result.ts            IPaginatedResult<T>
      problem-codes.ts               the frozen const union of machine-readable codes
      <feature>/index.ts             one barrel per domain area

    composition/
      container.ts                   createContainer(deps): IContainer — per request
      use-cases.ts                   one factory per use case
      tokens.ts                      re-export of every port token

    components/
      primitives/                    DataTable, StatCell, PanelHeader, HeatCell, MonoValue,
                                     StatusBadge, Sparkline, Toast, Popover, Drawer,
                                     ConfirmDialog
      phoneme-strip/                 signature component (Phase 10)
      mastery-matrix/                signature component — 44 phonemes OR 24 rule families
                                     via a `dimension` prop. One component, two dimensions.
      <feature>/                     feature components

    lib/
      env.ts                         the ONLY file that reads process.env
      supabase/server.ts             session client — anon + cookies, RLS applies
      supabase/service.ts            service client — service role, `import 'server-only'`
      api/with-api.ts                the one route-handler wrapper
      api/with-action.ts             the Server Action equivalent
      api/fetch-client.ts            typed client, re-validates, throws ApiError
      logger.ts                      pino
      i18n/                          next-intl setup
        messages/en.json  messages/bn.json

    shared/
      result.ts                      IResult<T, E> — zero dependencies, importable everywhere

  messages/ → src/lib/i18n/messages   (single location; no duplicate catalogue)
```

Tests are colocated: `submit-dictation-attempt.use-case.test.ts` sits beside its use case.
Playwright specs live in `e2e/`. Files are kebab-case, one public exported symbol per file.

---

## 3. Ports and tokens

Every port declares a `Symbol` token **beside its interface**. The container maps token →
implementation, and **only** `src/composition/` knows both halves. A use case receives
interfaces through its constructor and never reaches into the container.

```ts
export const WORD_REPOSITORY = Symbol('WORD_REPOSITORY');

export interface IWordRepository {
  readonly findById: (id: string) => Promise<Word | null>;
  readonly findByDay: (dayIndex: number) => Promise<readonly Word[]>;
}
```

### Repository ports — `domain/repositories/`

| Token | Interface | Module | Implemented in | Phase |
| --- | --- | --- | --- | --- |
| `WORD_REPOSITORY` | `IWordRepository` | library | `infrastructure/persistence/supabase/word.repository` | 5 |
| `PROGRAM_REPOSITORY` | `IProgramRepository` | program | `infrastructure/persistence/supabase/program.repository` | 5 |
| `LESSON_REPOSITORY` | `ILessonRepository` | lessons | `infrastructure/persistence/supabase/lesson.repository` | 5 |
| `ATTEMPT_REPOSITORY` | `IAttemptRepository` | lessons | `infrastructure/persistence/supabase/attempt.repository` | 5 |
| `REVIEW_ITEM_REPOSITORY` | `IReviewItemRepository` | review | `infrastructure/persistence/supabase/review-item.repository` | 5 |
| `MASTERY_REPOSITORY` | `IMasteryRepository` | progress | `infrastructure/persistence/supabase/mastery.repository` | 5 |
| `STREAK_REPOSITORY` | `IStreakRepository` | progress | `infrastructure/persistence/supabase/streak.repository` | 5 |
| `LEARNER_PROFILE_REPOSITORY` | `ILearnerProfileRepository` | auth | `infrastructure/persistence/supabase/learner-profile.repository` | 5 |

### Repository ports added by later phases — not named in `05-domain-model.md`

Recorded as decisions in section 5. Same convention, same wiring.

| Token | Interface | Module | Phase |
| --- | --- | --- | --- |
| `EXAM_DEFINITION_REPOSITORY` | `IExamDefinitionRepository` | exams | 7 |
| `EXAM_ATTEMPT_REPOSITORY` | `IExamAttemptRepository` | exams | 7 |
| `EXAM_QUESTION_REPOSITORY` | `IExamQuestionRepository` | exams | 7 |
| `EXAM_ANSWER_REPOSITORY` | `IExamAnswerRepository` | exams | 7 |
| `NOTIFICATION_REPOSITORY` | `INotificationRepository` | notifications | 8 |
| `NOTIFICATION_PREFERENCE_REPOSITORY` | `INotificationPreferenceRepository` | notifications | 8 |
| `PUSH_SUBSCRIPTION_REPOSITORY` | `IPushSubscriptionRepository` | notifications | 8 |
| `CERTIFICATE_REPOSITORY` | `ICertificateRepository` | certificates | 12 |

### Application ports — `application/ports/`

| Token | Interface | Implemented in | Phase |
| --- | --- | --- | --- |
| `CLOCK` | `IClock` | `infrastructure/adapters/system-clock` | 4 |
| `ID_GENERATOR` | `IIdGenerator` | `infrastructure/adapters/uuid-generator` | 4 |
| `UNIT_OF_WORK` | `IUnitOfWork` | Postgres function wrapper | 5 |
| `RATE_LIMITER` | `IRateLimiter` | Postgres fixed-window; Upstash Redis optional swap | 1 |
| `SPEECH_SCORER` | `ISpeechScorer` | `infrastructure/adapters/blend-speech-scorer` | 6 |
| `PUSH_SENDER` | `IPushSender` | `infrastructure/adapters/web-push-sender` (VAPID) | 8 |
| `IN_APP_NOTIFIER` | `IInAppNotifier` | `infrastructure/adapters/notification-writer` | 8 |

### Domain service ports — `domain/services/`

| Token | Interface | Implemented in | Phase |
| --- | --- | --- | --- |
| `REVIEW_SCHEDULING_POLICY` | `IReviewSchedulingPolicy` | `domain/services/review-scheduling.policy` | 4 |

`IClock` exists so streaks, exam deadlines and spaced repetition are testable at a fixed
instant. **Nothing in `domain` or `application` reads the system clock, `process.env`, or a
Supabase client.** The numbers `1, 3, 7, 16, 35` appear nowhere outside
`ReviewSchedulingPolicy` — grep is the test.

**Not declared, on purpose:** `IMailer`. The app sends no email; email is a v2 decision
(`09-notifications.md`). A port with no implementation is dead weight that drifts.

---

## 4. Database tables

Supabase Postgres 15. Plain SQL migrations, numbered, forward-only, **never edited after
they ship**. No ORM, no Prisma, no schema builder.

Every table, without exception:

```sql
id          uuid primary key default gen_random_uuid(),
created_at  timestamptz not null default now(),
updated_at  timestamptz not null default now()   -- + trigger from 009
```

Scores and percentages are `numeric`, never `float`. Timestamps are `timestamptz`, always.
Enumerated columns are `text` + a `check` constraint mirroring the TypeScript const union.

| Migration | Table | Group | RLS |
| --- | --- | --- | --- |
| `002` | `phonemes` | content | read: authenticated · write: service role only |
| `002` | `rule_families` | content | read: authenticated · write: service role only |
| `002` | `words` | content | read: authenticated · write: service role only |
| `002` | `word_phonemes` | content (join) | read: authenticated · write: service role only |
| `002` | `sentence_items` | content | read: authenticated · write: service role only |
| `002` | `program_days` | content | read: authenticated · write: service role only |
| `002` | `program_day_items` | content (join) | read: authenticated · write: service role only |
| `003` | `learner_profiles` | learner | own row only |
| `003` | `lesson_sessions` | learner | own `profile_id` · no client delete |
| `003` | `attempts` | learner | own `profile_id` · no client delete |
| `003` | `review_items` | learner | own `profile_id` · no client delete |
| `003` | `mastery_records` | learner | own `profile_id` · no client delete |
| `003` | `streak_records` | learner | own `profile_id` · no client delete |
| `004` | `exam_definitions` | exam (content) | read: authenticated · write: service role only |
| `004` | `exam_sections` | exam (content) | read: authenticated · write: service role only |
| `004` | `exam_attempts` | exam (learner) | own `profile_id` |
| `004` | `exam_questions` | exam (learner) | own attempt — **`correct_answer` unreachable from a client** |
| `004` | `exam_answers` | exam (learner) | own attempt |
| `005` | `notifications` | notifications | own `profile_id` |
| `005` | `notification_preferences` | notifications | own `profile_id` |
| `005` | `push_subscriptions` | notifications | own `profile_id` |
| `006` | `certificates` | certificates | own `profile_id` + **public read of the verification code only** |
| `009` | `rate_limits` | infrastructure | service role only (see decision D6) |

Every learner table carries
`profile_id uuid not null references learner_profiles(id) on delete cascade`.

### Indexes — `007`, each with a comment naming the query it serves

```
review_items    (profile_id, due_at)
attempts        (session_id)
exam_answers    (question_id)
exam_questions  (attempt_id, section_code, order_index)
words           (rule_family_id, week_index)
notifications   (profile_id, read_at)
lesson_sessions (profile_id, day_index)
```

### Functions, triggers and scheduled work — `009`

| Mechanism | What it does |
| --- | --- |
| `updated_at` trigger | on every table |
| `auth.users` insert trigger | creates the matching `learner_profiles` row. `BootstrapProfileUseCase` is the idempotent reconciler on top of it, not a substitute. |
| session-completion function | writes `attempts`, `review_items`, `mastery_records`, `streak_records` in one transaction, invoked through `IUnitOfWork`. Atomicity is never faked in TypeScript. |
| exam auto-submit (`pg_cron`) | submits attempts past `server_deadline_at`. Lives **in the database** so it works when the app is down; `/api/cron/exam-autosubmit` is the backstop, not the primary path. |
| rate-limit function | fixed-window counter behind `IRateLimiter`. Serverless invocations share no memory, so an in-process limiter would not limit anything. |
| `010_seed_reference` | 44 real phonemes, 24 real rule families. No placeholders. |

### Row interfaces

Hand-written from the SQL, in `src/modules/*/infrastructure/rows/`, **never** in `domain/`.
`supabase gen types` is used to *verify* them, never as the source of truth. A row interface
never leaves `infrastructure/`; the mapper is the only file that knows snake_case exists.

### The two-user proof

`supabase/tests/rls-two-user.sql` connects as two real users and proves user A cannot read
user B's `attempts`, `review_items`, `exam_attempts`, `exam_answers` or `notifications`.
It runs at the Phase 2 exit gate and again in Phase 13. Not optional, not replaceable by a
unit test.

---

## 5. Decisions I made that were not specified

Everything here was **absent** from `.claude/docs/`, not a departure from it. Anything that
would contradict a doc is not on this list — that would need the user's call.

**D1 — Nine feature modules.** The docs name features (`auth`, `program`, `lessons`,
`review`, `exams`, `progress`, `library`, `notifications`, `certificates`) through the route
table in `11-api-surface.md` but never fix the `src/modules/` folder names. I adopted those
nine names verbatim, one module per API module.

**D2 — Repository ports for exams, notifications and certificates.**
`05-domain-model.md` lists eight repository ports, all for content and learner state. Phases
7, 8 and 12 need persistence for exam attempts, questions, answers, definitions,
notifications, preferences, push subscriptions and certificates. I added the eight ports in
the second table of section 3, following the same convention. They are additions, not
replacements — the original eight are unchanged.

**D3 — Token naming.** A port's token is the `SCREAMING_SNAKE_CASE` of its interface name
without the `I` prefix, and its `Symbol` description is the identical string
(`IWordRepository` → `Symbol('WORD_REPOSITORY')`). The docs show this shape in one example;
I made it the rule so a token is derivable from a port name and vice versa.

**D4 — `src/shared/` for `IResult<T, E>`.** `02-typescript-rules.md` requires `IResult` in
the domain but gives it no home, and `domain` may import nothing — including `src/contracts`.
I created a `shared` zone holding zero-dependency primitives, importable by every layer, and
it will be declared as such in the `eslint-plugin-boundaries` config. It contains `IResult`
and nothing else until something else earns its way in. If `shared` starts accumulating,
that is a smell to raise, not to absorb.

**D5 — `IReviewSchedulingPolicy` is a domain-service port, not an application port.**
`06-spaced-repetition.md` gives it a `Symbol` token but not a layer. It is a pure rule over
domain concepts with no I/O, so it lives in `domain/services/` and is wired like any other
port. `ExamScoringService`, `ExamBlueprintService`, `MasteryCalculator`, `ErrorTagger` and
`NotificationPolicy` follow the same reasoning — pure, in `domain/services/`, and only
`ReviewSchedulingPolicy` is behind a port because only it is documented as swappable.

**D6 — `rate_limits` lands in `009_functions_triggers.sql`.** `03-database.md` requires the
table and its fixed-window function but its migration list assigns the table to no file. It
is neither content, learner nor exam data, so `002`–`006` all fit badly. Table and function
ship together in `009`, next to the function that reads it.

**D7 — Tests are colocated; e2e is not.** Unit, integration and component tests sit beside
the file they test (`x.use-case.ts` / `x.use-case.test.ts`). Playwright specs live in a
top-level `e2e/`. The docs mandate the runners and the coverage floor but not the layout.

**D8 — `withAction` mirrors `withApi`.** `01-architecture.md` names `withAction` for Server
Actions and says it shares `withApi`'s contract, without specifying it. It will take the same
options object minus `rateLimit`'s HTTP semantics, return the same typed errors, and reuse
`withApi`'s session resolution and Zod parsing — one implementation, two entry points.

**D9 — A single i18n catalogue location.** Message catalogues live at
`src/lib/i18n/messages/{en,bn}.json`. `next-intl`'s convention allows a top-level
`messages/`; two candidate locations invite two half-filled catalogues, and CI fails on any
key present in `en` and missing in `bn`.

**D10 — `problem-codes.ts` in `src/contracts`.** `11-api-surface.md` says the machine-readable
`code` is the client contract and that codes are declared in `src/contracts` as a frozen const
union; it does not name the file. One file, one frozen const object, one derived union,
consumed by `withApi`'s error mapping and by the client's `ApiError`.

**D11 — Phase 0's test is a shell script.** `PROGRESS.md` gives F0.1 a test
("all five sections present; every port in `05-domain-model.md` appears in the token table")
but Vitest does not exist until Phase 1. `scripts/check-architecture-doc.sh` runs that check
today with no dependencies. It also asserts the inverse: a port `05-domain-model.md`
explicitly negates (`IMailer`) must be **absent** from the token table. When Vitest lands the
check can be ported; until then a real, runnable, failing-when-wrong check beats a claim.

**D12 — Columns `05` and `09` imply but do not name (F2.4).** `09-notifications.md` gives
`Notification` a `severity` with no values, and an idempotency key on
`(profile_id, type, scheduled_for)` without a `scheduled_for` column. So: `severity in
('info', 'success', 'warning', 'critical')`, mapped to the design tokens in the UI rather
than storing token names in the database; `scheduled_for` is the **window the dispatcher
aimed at**, not when it ran, which is what keeps the key stable across a platform retry.
`push_subscriptions.endpoint` is unique **globally**, not per learner: it identifies a
browser install, so a re-subscribe moves the row instead of duplicating it and a push can
never reach the wrong person. Certificates get `revoked_at` / `revoked_reason` because a
revoked certificate must still verify — as revoked; deleting the row would make a forged
copy of the code indistinguishable from one that never existed. The verification code format
is `XXXX-XXXX-XXXX`, uppercase, because it is read off one screen and typed into another.

### Open — needs the user, not me

**O1 — `02-typescript-rules.md` still says `packages/config` base tsconfig.** That is a
leftover from the pre-restructure monorepo layout and contradicts the single-app rule in
`CLAUDE.md` §3 and `01-architecture.md`. Phase 1 will need one root `tsconfig.json` with the
same flag list. Amending the doc belongs to **F0.2** (confirm/amend the phase and feature
list), so it is recorded here and left untouched.

---

## Living document

When a decision changes, change it here in the same commit. A stale architecture record is
worse than none — it is a confident lie about the shape of the code.
