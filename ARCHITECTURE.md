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
| `EXAM_WRITE_UNIT` | `IExamWriteUnit` | exams *(application port — 015/016/017)* | 7 |
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
Twenty-two of them, one per table, each in the module that owns the table. They are *verified*
against the Postgres catalogue and never generated from it (D20). A row interface never leaves
`infrastructure/`; the mapper is the only file that knows snake_case exists.

### The two-user proof

The proof connects as two real `authenticated` roles — `set_config('request.jwt.claims', ...)`
per user, exactly as PostgREST does — and shows user A cannot read user B's `attempts`,
`review_items`, `exam_attempts`, `exam_answers` or `notifications`. It ships as the
`008 RLS policies — the two-user proof` block in `src/lib/db/migrations.apply.test.ts`, not as
a standalone `.sql` file, so it runs on every `pnpm test` rather than only when someone
remembers to. It ran at the Phase 2 exit gate and runs again in Phase 13. Not optional, and
not replaceable by a unit test — it exercises the real policies against a real Postgres.

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

**D13 — A constraint's btree is the index; 007 documents it rather than repeating it (F2.5).**
`03-database.md` lists seven access paths to index. Two of them —
`exam_answers (question_id)` and `exam_questions (attempt_id, section_code, order_index)` —
are already `unique (...)` constraints from `004`, and Postgres enforces a unique constraint
with a btree on exactly those columns in exactly that order. Creating them again would add a
second identical index to every write on the two hottest tables in an exam and serve no read
the first does not. So `007` creates five indexes and carries `comment on index` for the two
constraint-backed ones, which satisfies the doc's rule — an index exists only with the query
it serves named in a comment — without paying for the duplicate.

The same comment rule reaches `exam_attempts_one_active_per_exam`, the partial unique index
`004` creates explicitly. It is both an integrity rule and the lookup behind crash-safe
resume, so it stays where the rule it enforces lives and is commented in `007`, where the
index rule is kept. The catalogue test draws the line at `pg_constraint`: an index backing a
declared constraint exists for correctness and needs no query comment; an index somebody
chose to create must name its reader.

**D14 — How the policies in `008` are shaped (F2.6).** `03-database.md` gives the rule —
a learner reads and writes only rows whose `profile_id` resolves to `auth.uid()`, no client
delete — but not the mechanism. Four choices, none of them departures:

`public.current_profile_id()` resolves the caller's `learner_profiles.id` once instead of
each policy re-planning the same subquery. It is `security definer` because it reads
`learner_profiles`, which is itself under RLS, and a policy that had to consult a policy to
evaluate would not terminate. Its `search_path` is pinned to `public, pg_temp`: a
`security definer` function that resolves its own table name through a caller-controlled
search path is a privilege escalation.

The file opens by revoking all table and function privileges from `anon` and `authenticated`
and then granting back only what each shape needs. Supabase grants the client roles broad
privileges by default, so starting from revoke means a table added later is unreachable
until someone grants it deliberately, rather than readable because nobody remembered.

`exam_questions` gets no policy and no grant at all. RLS is on, so the client is refused at
the privilege layer — stricter than an empty result, and stricter than any select policy
could be while `correct_answer` sits in the row. F2.7 opens the column-limited subset; until
then the API reads the table through the service role and nothing else reads it.

`certificate_verifications` is a view, not an anon policy on `certificates`. `006` promised
this door to `008`. A row-level policy exposes every column of any row it matches, which
would publish `profile_id` and the day-1/day-28 `comparison`; a view that never selects them
cannot leak them. `revoked_at` is exposed on purpose — a revoked certificate must verify as
revoked.

**Noted, not acted on:** learner tables grant `select, insert, update` exactly as the doc
specifies, which means the policies alone would let a client write its own `attempts.score`
or `exam_attempts.score_percent`. Those columns are server-authoritative and the API writes
them with the service role, so the exposure is theoretical today — but "written as if the API
did not exist" is the standard this file is held to, and it is not met for score-bearing
columns. Tightening it contradicts the doc's stated grant list, so it belongs to the Phase 13
hardening pass or to a doc amendment, not to F2.6.

**D15 — F2.7 ships tests, not SQL, because 008 already overshot it.** `03-database.md`
offers two mechanisms for protecting `exam_questions.correct_answer`: a column-level policy,
or a view that excludes the column. `008` reached a stricter state than either by granting
the client nothing on the table at all, so the column is refused at the *privilege* layer —
before RLS, before any column list, for `anon` and `authenticated` alike. A column-level
policy would be weaker (it implies a grant), and a client-facing view would be weaker still
and would have no consumer: the app reads questions through use cases on the service role,
never through PostgREST, so a client view would be scaffolding for a caller that does not
exist. `CLAUDE.md` §7 forbids that outright.

Adding SQL anyway was not available regardless. `scripts/migrate.mjs` enforces forward-only
by checksum — editing an applied migration is an error — so `008` cannot absorb the change,
and `03-database.md` assigns F2.7 no file number of its own: `009` and `010` are spoken for
by functions/triggers and the seed. Renumbering those would contradict a doc rather than
extend one.

So F2.7's deliverable is the lock, not the mechanism. The runtime proof asserts
`has_column_privilege` is false for every client role against every column of the table, not
just `correct_answer`, since a learner reading `payload` for someone else's attempt has also
read an unreleased exam. It asserts no view in the schema carries the column, because a view
runs as its owner and would bypass the table privileges entirely. The static proof sweeps
every migration file that will ever exist for a grant, a policy, or a view touching it. The
realistic way this protection dies is not today's schema — it is a migration six phases from
now granting the table to make a screen work, and that is what these tests exist to catch.

The corollary is that `exam_questions` is unreadable by the client **entirely**, not merely
column-restricted. Phase 7 must therefore serve every question through the service role. If a
later phase wants direct client reads, it needs a view over the safe columns filtered by
`current_profile_id()` — a deliberate addition with its own feature and its own test, not a
grant bolted onto an existing migration.

One wart follows from this and cannot be cleaned: the header comments inside
`008_rls_policies.sql` say the client-visible subset "is F2.7's job" and describe a view
that F2.7 decided not to build. The comments are wrong and must stay wrong — the file's
checksum is what makes the migration ledger forward-only, and editing a comment changes it
exactly as much as editing a policy. This entry is the correction.

**D16 — `complete_lesson_session` takes jsonb and computes nothing (F2.8).** `03-database.md`
asks for "one Postgres function writing `attempts`, `review_items`, `mastery_records` and
`streak_records` in a single transaction, invoked through `IUnitOfWork`" but does not give it
a signature. `CLAUDE.md` §10 forbids business logic a domain service should own from living
in a Postgres function, and the interval ladder, the mastery rule and the streak day boundary
are all Phase 4 domain services. So the function is the transaction boundary and nothing
else: it receives rows the domain has already decided on and writes them atomically.

It takes jsonb rather than a pile of scalars because the shapes belong to the domain, and
flattening them into SQL parameters would drag those rules into the database — the parameter
list would have to know what a review item is. `profile_id` is never read from the payload;
it is resolved from the session row under `for update`, so a caller cannot file attempts into
someone else's history. The function returns the attempt count so `IUnitOfWork` can assert
the payload it sent is the payload that landed.

Auto-submit marks an expired attempt `submitted`, never `passed` or `failed`. A deadline
passing is not a grade; the exam engine scores it. This is why `exam_attempts_finished_has_
outcome` demands an outcome only for the two graded statuses.

**D17 — Every function created after `008` has to revoke itself (F2.8).** Postgres grants
`execute` to `PUBLIC` on a newly created function, and `008`'s revoke sweep is a one-time
statement over the functions that existed when it ran. Without the four explicit revokes at
the foot of `009`, an anonymous visitor could call `complete_lesson_session` directly and
write a finished lesson, a mastery rollup and a streak for any session id they could guess —
the function is `security definer`, so it would run with the owner's rights. The runtime test
asserts `has_function_privilege` is false for `anon` and `authenticated` on all four. Any
migration adding a function from here on carries the same obligation.

**D18 — The signup trigger changed what a test fixture means (F2.8).** Once `auth.users`
insert creates the profile, a fixture that inserts its own is a duplicate-key error. Ten
fixtures predating the trigger were converted to upsert on `user_id`. This is worth recording
because the same collision will hit the application: `BootstrapProfileUseCase` must be
idempotent *on top of* the trigger, not a substitute for it, and the test proving that is in
`migrations.apply.test.ts` rather than waiting for Phase 3.

**D19 — The seed asserts what it wrote, not what the table holds (F2.9).**
`03-database.md` says `010_seed_reference` carries "the 44 phonemes and 24 rule families —
real data, not placeholders" but does not say how a deploy proves it. The obvious guard,
`count(*) = 44`, is wrong twice over: it is a permanent table-wide invariant expressed in a
block that runs once, and it makes the migration unre-runnable against any database holding
a row the seed did not write. So the guard lists every IPA symbol and every rule-family code
and asserts each is present, then checks the 12/8/24 type split across exactly those rows.
That is strictly stronger — it catches a mistyped IPA character, which no count can see —
and the closed-set claim (the table holds 44 and only 44) moved to
`migrations.apply.test.ts`, where it runs against a database migrated from empty, which is
the condition production is actually in.

Idempotency comes from `on conflict (symbol) / (code) do update`, not from `if not exists`,
which cannot guard an insert. A correction to a Bangla annotation therefore ships as a new
numbered migration that re-states the row — forward-only survives intact.

**D20 — The Postgres catalogue verifies the row interfaces, not the Supabase CLI (F2.10).**
`03-database.md` says to use `supabase gen types` to *verify* the hand-written interfaces. The
CLI is deliberately not installed — F2.1 established the no-Docker, no-Supabase-CLI migration
path — and it additionally needs live project credentials, so a gate built on it could not run
in CI and would be skipped in practice. What `gen types` does is read the Postgres catalogue
and map each column to a TypeScript type. `src/lib/db/rows.test.ts` reads the same catalogue,
produced by the same migrations inside PGlite, and applies the same mapping. It is the stricter
of the two: it also checks column *order*, `readonly` on every member, the interface-to-filename
rule, which module owns which table, and that no row interface has escaped `infrastructure/`.
The intent of the doc is met; the tool named in it is not the thing that meets it.

`jsonb` maps to `Json` (`src/lib/db/json.ts`) and never to a narrower shape. A row interface
describes what the database guarantees, and the database guarantees well-formed JSON and no
more. Narrowing happens in the mapper, which is allowed to fail and say why.

**D21 — Forcing `httpOnly` closes the browser Supabase client, deliberately (F3.1).**
`04-authentication.md` requires the session to live in httpOnly cookies. `@supabase/ssr` does
not do this on its own: its `DEFAULT_COOKIE_OPTIONS` set `httpOnly: false`, because its
`createBrowserClient` is designed to read the session back out of `document.cookie`. The two
positions cannot both hold. `src/lib/supabase/session-cookie-options.ts` overrides the library
default, writing `httpOnly` last so no caller can reopen it.

The consequence, recorded because the doc does not spell it out: **no browser-side Supabase
client can ever hydrate a session in this app.** `createBrowserClient` is not a third client
we are yet to write — it is now unusable by construction. `useSession()` (F3.5) must therefore
be fed by the server, through a provider whose value came from a Server Component that already
verified the session, and never from a client reading cookies. That is the stricter reading of
"identity always comes from the server-verified session", and it is the one the cookie
attribute now enforces rather than merely asks for.

`secure` is deliberately *not* forced here. It would break plain-http local development, and
the choice belongs with the middleware that owns the response (F3.4), which knows the request
protocol. It is listed in this file rather than left implicit so it cannot be forgotten.

**D22 — Sign-in is a plain HTML form to a route handler, not a Server Action (F3.2).**
`01-architecture.md` allows Server Actions for simple form mutations, and starting sign-in
looks exactly like one. It is not, for two reasons that both come from decisions already made.

First, the test: `/login` must contain **zero input elements**. React renders a hidden
`<input name="$ACTION_ID_…">` inside every Server Action form so the form still works without
JavaScript. An action form therefore cannot satisfy the requirement, whatever the visible
markup says.

Second, D21: the OAuth url must be built by the *server* Supabase client, because
`signInWithOAuth` writes the PKCE code verifier through the cookie adapter and that cookie is
httpOnly. A browser client cannot participate in this flow at all any more.

So `/login` posts a plain form to `POST /auth/signin`, which builds the url and answers 303.
The consequences, recorded so nobody re-litigates them:

- Sign-in works with JavaScript disabled — a real gain, not a consolation.
- `POST`, not `GET`: each press mints a code verifier and discards the previous one, so the
  route must be unreachable by a prefetch, a link or an image tag.
- The form's `action` is a string literal, so a rename of the route silently breaks the button.
  The e2e test posts to `/auth/signin` directly to keep that honest; if a third caller ever
  appears, promote the path to a shared constant.
- `/login?error=google` renders a `role="alert"` line. It exists because the alternative was a
  button that does nothing when url construction fails. `/auth/callback` (F3.3) should reuse
  this surface rather than invent a second one.

**D23 — "Brand new" is a column, not an inference (F3.3).**
`04-authentication.md` says the callback routes a brand-new profile to `/onboarding` and an
existing one to `/dashboard`. Nothing in the schema could tell those apart.

The obvious reading — "does a `learner_profiles` row exist?" — is wrong here. 009's signup
trigger creates that row in the same transaction as the `auth.users` insert, so it is already
true for a learner who has never seen a screen, and `/onboarding` would be unreachable. The
profile's own columns cannot answer it either: `track`, `daily_minutes`, `timezone` and
`accent_preference` all carry a default from 003, so a value there does not mean anyone chose it.

A `created_at = updated_at` heuristic would work today and stop working the first time anything
else writes to the profile before onboarding. That is a trap, not a design.

So migration **011** adds `learner_profiles.onboarding_completed_at timestamptz`, null until the
learner has answered the onboarding questions. Consequences:

- Nothing writes it until Phase 11 ships the onboarding screen, so until then every learner
  routes to `/onboarding`. That is correct, not a stub: with no way to answer the questions,
  nobody has answered them.
- The callback parses the column with Zod like any other external response, rather than
  trusting the untyped Supabase result. It reads that one column and no more — a handler that
  selected the whole profile would look like it owned it.
- Anything short of a profile that says otherwise routes to `/onboarding`: no row, an
  unreadable row, a shape that does not parse. Sending an onboarded learner through onboarding
  costs a screen; sending a new one to a dashboard with no answers to render is a broken first
  impression.
- 008 grants `authenticated` a table-wide `update` on `learner_profiles`, so a learner can write
  this column themselves — as they already can `current_day_index`. That is a pre-existing
  Phase 2 RLS gap, recorded in `PROGRESS.md`'s NEXT block, not something F3.3 introduced or
  should fix.

**D24 — The middleware's three unspecified choices (F3.4).**

*`secure` comes from the app url, not the request.* D21 left `secure` off the session cookie
and said the middleware would own it, "which knows the request protocol". It does not, safely:
behind a proxy the protocol arrives as `x-forwarded-proto`, a header the client sends, so an
attacker could ask for a cookie without `secure` and then read it off a downgraded connection.
`NEXT_PUBLIC_APP_URL` is configuration rather than input, it gives the same answer on every
code path — so the middleware and the `next/headers` store cannot disagree about one cookie —
and `http://localhost` still yields `false`, which is what kept `secure` off in the first place.
It lives in `toSessionCookieOptions` beside `httpOnly`, written last so no caller can reopen it.

*API routes are outside the matcher.* The gate asks for two different answers to "no session":
a page redirects to `/login`, a handler returns 401 problem+json. Middleware can only give the
first, and giving it to `fetch('/api/v1/me')` hands the caller a 200 full of login markup
instead of an error it can branch on. So the matcher excludes `/api/`, and `withApi` owns every
API 401 (F3.6). `/api/certificates/<code>/verify` is then public by construction rather than by
a rule, and `/api/cron/*` keeps authenticating with its bearer secret (F3.8).

*One session client, two transports.* Middleware runs before the `next/headers` store exists,
so it needs cookies from the request and the response instead. Rather than construct a third
Supabase client — `04-authentication.md` allows exactly two — `session-client.ts` now has one
private builder taking a cookie adapter, and two exported factories over it. Neither can skip
`toSessionCookieOptions`, which was the risk worth designing against.

*And one thing deliberately not done:* the redirect to `/login` carries no `?next=` return path.
Honouring it means `/login` and `/auth/callback` both have to thread and validate it, and an
unvalidated one is an open redirect. It belongs with the feature that needs it, not here.

**D25 — Middleware stays on the Edge runtime, with a known build warning (F3.4).**
`next build` reports that `@supabase/supabase-js` reads `process.version`, unavailable on Edge.
The check falls through to the global-fetch branch, which is correct there, and the e2e tests
pass against the real build. The only fix is `experimental.nodeMiddleware`, and depending on an
experimental Next flag in a production app is worse than a warning that is written down.
Revisit when Node middleware is stable.

**D26 — pino stops redacting a credential this app cannot have (F3.11).**
The exit gate is a grep over `src/` for `password`, `magic.link` and `signInWithOtp`, and it had
exactly one hit: `'*.password'` in the logger's redaction paths.

Two ways to resolve that, and only one of them is honest. Keeping the path means the gate needs
an exception list, and an exception list is how a real hit gets waved through — the next person
sees a known-good match and moves on. Removing the path costs nothing real: Google is the only
provider, no field anywhere accepts a password, no schema has one, and nothing in the codebase can
produce an object carrying one. Redaction is defence in depth against values you hold, and this
is not one of them. The other three paths — `authorization`, `cookie`, `accessToken` — stay,
because those are real.

The grep is now `src/lib/auth/one-door.test.ts` rather than a command someone remembers
to run, and it sweeps test files too: a test that types a password into a form is a form that
accepts one. It also means the explanation cannot live in a comment beside the code it explains,
which is why it is here — and why the test is not named after the thing it forbids.

**D27 — `withApi` does not inject a container; `src/composition/handlers.ts` does (F3.10).**
`01-architecture.md` sketches the wrapper as `withApi({ handler: async ({ user, body, container })
=> … })`, with the container arriving in the handler context. That cannot work here, and the
reason is the dependency rule the same document sets: `withApi` lives in `lib`, and `lib` may
import `lib` and `contracts` only. `presentation` cannot reach the composition root either.
Either the wrapper imports `composition` — inverting the graph — or something else joins the two.

So a handler is a **factory** that takes the use case it needs, and `src/composition/handlers.ts`
is the one file that knows where that comes from:

```ts
export const getMeHandler = createGetMeHandler(() => makeGetMe(createContainer(crypto.randomUUID())));
```

`src/app/api/v1/me/route.ts` then re-exports it and stays three lines, which is what the sketch
was really protecting.

Two details that are not incidental. The use case arrives as a **thunk**, not a value: a
container holds a request-scoped client, and one captured at module load would outlive the
request that justified it. And the factory takes the use case rather than the repository —
`presentation` may import `domain`, so it *could* take the port, but a handler holding a
repository is a handler one conditional away from owning a rule.

**D28 — the sweeps are the phase's real deliverable, as much as the code (F3.7, F3.11, F3.12).**
Four rules in `04-authentication.md` are properties of the whole tree rather than of any one
file: only three ways to read the user, protection by omission, no second door, identity only
from the session. Each is now a test that walks `src/`:

| Rule | Test |
| --- | --- |
| `auth.getUser(` in two files and no others | `src/lib/auth/session-boundary.test.tsx` |
| every public endpoint on a written list | `src/lib/api/public-routes.test.ts` |
| no credential path anywhere | `src/lib/auth/one-door.test.ts` |
| no identity from a body, a query or a fabricated object | `src/lib/auth/identity-from-session.test.ts` |

The last two are close to vacuous today — there is no v1 request schema until Phase 5 — and they
are written that way on purpose. A rule that is checked only when someone remembers to check it
is not a rule, and the moment these start mattering is the moment nobody will be thinking about
them.

**D29 — a `shared` module for what no feature owns (F4.1).**
`DayIndex`, `ScorePercent`, `IpaTranscription`, `ErrorTag`, `LocalDate`, `normaliseAnswer` and
the four application ports are used by program, lessons, review, progress and exams alike.
`05-domain-model.md` does not say where they live. Putting them in whichever module happened to
need them first would have had four modules importing from a fifth that has no stake in the
concept — so `src/modules/shared/` exists, below all of them.

`Track` **moved** out of `auth` for the same reason: it says how long the programme is, which is
a question program, lessons and review all ask and auth does not.

**D30 — `LocalDate` and `zonedDayStart`, rather than a timezone library (F4.4, F4.5).**
Every learner-facing day boundary — streaks, due dates, the "3 different calendar days" mastery
rule — is computed in the learner's zone. `Intl` already carries the IANA database, so the two
operations the domain needs (what day is it there, when does that day begin) are ~40 lines
rather than a dependency. `zonedDayStart` samples the offset **twice**: the first sample is
taken at a guessed instant which, on the two days a year a zone shifts, can sit on the wrong
side of the transition.

**D31 — two additions to `IReviewSchedulingPolicy`'s sketched interface (F4.4).**
`06-spaced-repetition.md` sketches three methods. Two more things were needed:

- `nextIntervalIndex`, because "a correct answer advances one rung, capped at rung 4" is a fact
  about the ladder's *length*, and the ladder's length is exactly what `ReviewItem` must not know.
- a `timezone` parameter on `nextDueAt`. The doc's own signature omits it while the prose two
  lines above requires the due date to land on the learner's day boundary rather than at the
  submission instant. The signature cannot deliver what the prose asks for.

**D32 — mastery is granted once and never revoked (F4.6).**
The spec says when `isMastered` becomes true and never says when it becomes false. A mastered
item that is later missed already drops to rung 0 and returns tomorrow — that is the correction,
and it is enough. Taking the badge back as well tells a learner they have un-learned something,
which is untrue and is how people stop.

**D33 — the streak's fifth case: the local day going backwards (F4.7).**
`05-domain-model.md` covers first activity, same day, next day and a gap. It does not cover a
learner active in Dhaka on the 19th opening the app in New York on the 18th, where every
comparison reads a gap of minus one. Treated as "same day" — nothing changes, and
`lastActiveDate` is never walked backwards — because resetting the streak of somebody who got on
a plane is the worse wrong answer.

**D34 — `ErrorTagger` says nothing rather than something wrong (F4.8).**
Every rule fires on a shape *characteristic* of an error, not on a proof of one. An unrecognised
wrong answer therefore returns no tags at all. An untagged error is a gap in coverage the content
team can see; a mis-tagged one teaches the learner the wrong lesson, which is worse than teaching
them nothing. Word order short-circuits the sentence rules for the same reason — the right words
in the wrong order also read as a missing article and a wrong preposition, and four tags for one
mistake is noise.

**D35 — eleven repository ports, not the specified eight (F4.9).**
`05-domain-model.md` lists one library repository. Phonemes, rule families and sentence items are
separate tables read by different screens, and one port spanning four aggregates cannot be
implemented narrowly by anything. What the ports *refuse* carries the design:
`IAttemptRepository` has `append` and no `save`, because 003 gives the client no update and a
port offering one routes around it; `IReviewItemRepository.findDue` takes no limit, because the
cap of 25 and the most-overdue-first ordering are product rules that would be invisible and
untestable inside SQL.

**D36 — `IRateLimiter` lives in `src/contracts`, not in `application/ports` (F4.10a).**
`05-domain-model.md` lists it as an application port. Its only caller is `withApi`, which lives
in `src/lib` — and the boundary rules let `lib` import `contracts` and forbid it importing
`application`. Declaring the interface where both sides may legally see it beats loosening the
boundary rule or writing it out twice.

Two further choices in that feature, neither specified. The limiter **fails open and logs
loudly**: it is abuse protection, not an authorisation control — RLS and the session are what
stand between a stranger and a learner's data, and locking every learner out because a counter
table hiccuped is the worse failure. And it is imported **lazily**, inside the request, because a
static import made every route module read and validate the Supabase environment at load time,
`/api/health` included.

**D37 — a review answer writes no `attempt` row (F4.14).**
`attempts.session_id` is `not null` in 003 and a review happens outside a lesson session.
Inventing a session to hang it off would corrupt every per-session number the product reports, so
the review item's own counters — `timesSeen`, `timesCorrect`, `consecutiveCorrect` — are the
record of what happened.

**D38 — verification is paused, and four probes were kept anyway (Phase 4).**
The user paused test-writing, coverage and every exit gate on 2026-08-19 (`CLAUDE.md` section 0).
Four test files were still written and kept, each because the claim being made could not be
settled by reading code: the spaced-repetition engine's five mandatory cases, that all nine error
tags are reachable from a real wrong answer, that `consume_rate_limit` refuses the 61st request,
and that the review queue returns 25 of 40 in the right order. Everything else in Phase 4 is
typechecked and linted and otherwise unverified, which is the trade that was asked for.

**D39 — one `IDatabase` seam instead of a Supabase type per repository (F5.1).**
`IDatabase` describes a single-table query rather than chaining one: no joins, no mapping, no
identity map. Two reasons, both learned in Phase 3. Supabase's fluent builder is generic enough
that checking a test double against it makes the compiler give up (TS2589), which is why the auth
repository had hand-rolled its own narrow slice; and "only `src/lib/supabase/` constructs a
client" is enforceable by grep only if a repository cannot *name* the client type. The Phase 3
slice was migrated onto the shared seam and deleted rather than excepted from the sweep.

The adapter lives in `shared/infrastructure`, not beside the client in `src/lib`, because `lib`
may not import `infrastructure` and the dependency runs the other way anyway.

**D40 — `IUnitOfWork` could not be built, and was replaced (F5.4).**
`05-domain-model.md` lists it and `01-architecture.md` assumes it. A callback unit of work
assumes the caller can open a transaction and run statements inside it; Supabase speaks
PostgREST, where every call is its own HTTP request and therefore its own transaction.
`run(work)` would have compiled, run, and provided **no atomicity at all** — a lie in a type,
worse than the missing feature.

`ILessonWriteUnit` replaces it. Each method is one Postgres function call, and the domain has
already decided every value. Two migrations came with it:

- **013 `record_lesson_attempt`** — the per-answer transaction 009 never had. One answer touches
  four tables; a failure after the second leaves a learner whose review ladder advanced and whose
  mastery did not.
- **014 `complete_lesson_day`** — 009's function does not touch `learner_profiles`, which only
  became a problem when F4.12 made `current_day_index` something the application moves. A new
  function rather than a replacement: `create or replace` with a different argument list makes an
  overload, and migrations are forward-only.

Session counters are incremented **inside** 013 rather than written from a TypeScript-computed
total — two concurrent answers would each write "the total as I saw it" and one would be lost.

**D41 — the limiter and the seam both fail in a chosen direction (F4.10a, F5.5).**
`PostgresRateLimiter` **fails open and logs loudly**: rate limiting is abuse protection, not an
authorisation control, and locking every learner out because a counter table hiccuped is the
worse failure. `RetryingDatabase` retries 40001 **exactly once**, with no backoff — the
conflicting transaction has already committed, so there is nothing to wait for, and a second
retry turns a contended row into a queue of clients all retrying at once.

**D42 — `withApi` validates path params (F5.7).**
A path segment is as untrusted as a body: `:dayIndex` arrives as `"99"` or `"../../etc"` as
readily as `"3"`. A handler coercing it itself hands `NaN` to a use case, where `DayIndex.of`
throws and the result is a **500 for what is really a 422**.

Statuses are kept apart deliberately: a locked day is 403, a missing day 404, an illegal stage
transition **409 rather than 422** — the body was well-formed, and saying otherwise sends the
client looking in the wrong place.

**D43 — `src/composition/reads.ts` is the read path for pages (F5.8).**
It calls the same factories `handlers.ts` calls, so a Server Component and its endpoint are one
implementation with two callers rather than two that agree on the day they were written. Four
sweeps hold it over `src/app`: no page fetches this app's own API, none constructs a use case,
none imports a repository or a domain type, and both composition files draw from one factory
module.

**D44 — the public-routes sweep now follows the re-export (F5.9a).**
A real hole, open since Phase 3 and only reachable from F5.7. The sweep read `route.ts` and
nothing else; every handler now lives behind a three-line re-export, so a module handler could
have been made public without appearing on F3.7's written list. It follows two hops now, proven
by making `/review/due` public in its handler and watching the sweep fail.

This is the third time a sweep has been tripped by a **comment** describing the thing it bans
(F3.11's pino redaction, F4.5's ladder interval, F5.8's "no fetch here"). The answer has been the
same every time: reword the comment, never add an exception.

**D45 — the confusion map carries `kind` and `graphemeShifts` (F6.2).**
`07-speech-scoring.md` sketches `IPhonemeConfusion` with five fields. Both additions are
forced by the document's own privacy constraint: the server receives **text**, never audio,
so a phoneme swap is only ever visible as a spelling shift — `very` arriving as `wery` — and
`graphemeShifts` is that shadow. `kind` exists because not every confusion casts one: an
epenthetic vowel adds a syllable at the front, a dropped cluster shortens the end, and a
stress error changes nothing a recogniser writes down at all. Naming the kind keeps the
detector one function per shape instead of the `if` chain the doc explicitly bans.

**D46 — `IPronunciationScoreInput` changed shape (F6.6).**
`expectedIpa: string` is gone; `expected: ISpokenForm` — segmented sounds plus the stressed
index — replaces it, and `heard: ISpokenForm | null` is new. Cutting IPA into sounds needs the
44-phoneme inventory, and the port is deliberately synchronous, so a scorer holding a raw
string would have to load the inventory itself. The caller has already read the stored G2P to
write per-phoneme mastery, so it hands over what it holds. `heard` is the only route by which
a stress error is ever diagnosable: a transcript cannot carry it, and it is never guessed.
The port had no implementation and no caller when this changed.

**D47 — homophones are data, and the orthographic half measures against the closest
acceptable spelling (F6.5).** `07` requires the homophone case to be handled explicitly and
does not say how. The recogniser writes a *word*, so a learner who pronounced `there`
perfectly may well get `their` back; measuring the transcript against the closest acceptable
rendering makes that cost nothing while a real vowel error still costs what it should. Groups
that merely merge in some accents are left out — `caught`/`court` is a merger, not homophony,
and treating it as one would forgive an error the programme is teaching.

**D48 — the near-miss ceiling is also the pronunciation pass mark (F6.8).**
`attempts.is_correct` needs a threshold and no doc gives one. Rather than invent a second
number, `isCorrect` is "no diagnosis, and above the 90 the near-miss band tops out at" —
because that is what the ceiling already means: above it there is no named error left.

**D49 — F6.7 was written as a real test suite during the test pause (F6.7).**
`CLAUDE.md` section 0 pauses test-writing, and F6.7's entire deliverable is a table of ≥40
cases. There was nothing else to build for it, so it was built as a suite and run (75/75). It
is the only file this run added under `*.test.ts`, and the pause is otherwise untouched.

**D50 — `GET /exams/attempts/:id/result` is a route `11-api-surface.md` does not list (F7.11).**
The table lists eight exam routes and a review among them, but no way to re-read a score. A
learner who closes the result screen and comes back needs one, and folding it into the review
would make the result page download 150 questions **and the answer key** to show a single
number. An addition, not a contradiction: nothing else changed.

**D51 — three Postgres functions for the exam engine (F7.4, F7.10, F7.13).**
Following D40's finding that PostgREST gives one transaction per call: **015** writes an attempt
and its whole paper together (a row without questions is unanswerable *and* blocks the exam
forever, via the one-live-attempt index); **016** writes marks, outcome, prescription and the
learner's position together; **017** `create or replace`s 016 to widen its guard from "still
open" to "still open, or handed in and never marked", which is what lets the cron backstop
finish what 009's pg_cron job hands in ungraded. Migrations stay forward-only — 016 was not
edited.

**D52 — `IPronunciationJudge` is declared in the exams domain (F7.10).**
Marking a pronunciation question needs Phase 6's scorer, and an exams domain service importing
an application port would invert the dependency rule. So the exams module states what it needs —
a number out of 100 for a transcript against a target — and one infrastructure adapter connects
it to `ISpeechScorer`. It is asynchronous, which `ISpeechScorer` deliberately is not: cutting
stored IPA into sounds needs the 44-phoneme inventory, and the inventory is a table.

**D53 — how an exam's candidate pool is assembled (F7.4).**
No doc says where questions come from. Words are filtered by `week_index` against the exam's
coverage, which is derived from the **fraction of the track** the unlock day sits at rather than
`day / 7` — the sprint compresses four weeks into 21 days, so `ceil(11 / 7)` would ask a
sprint learner about material they have not reached. Sentences carry no week (they are placed by
`program_day_items`), so the whole set is read once and the blueprint's weakness ranking chooses.
Weakness comes from the learner's review items; an item never tested scores **0.5**, because 0
would mean an exam never asks anything new and 1 would fill the paper with unseen material.

**D54 — the public-routes sweep follows the handler, not the barrel (F7.13).**
It used to read `route.ts`, then join the text of **every** import of `src/composition/handlers.ts`.
The first cron route made all 22 routes look like opt-outs. A sweep that fails for everything is
as useless as one that passes for everything and fails in the direction that gets it switched
off, so it now resolves the symbol the route re-exports, the single `export const` that defines
it, and the factory that declaration calls. Mutation-probed with a planted `auth: 'public'`.

**D55 — F7.9 and F7.14 were written as real test suites during the test pause (F7.9, F7.14).**
The same call as D49. Both features' entire deliverable is an assertion — "a snapshot test over
every exam response" and "all attacks rejected or resumed correctly" — so there was nothing else
to build, and shipping them unrun would be shipping them unbuilt. Three `*.test.ts` files were
added across Phases 6 and 7; the pause is otherwise untouched.

**D56 — three optional VAPID variables, and push degrades rather than fails (F8.3).**
`VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in `env.server.ts`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in
`env.public.ts` — the public half is public *by design*, since the browser hands it to the push
service to subscribe. All three are optional as a set: `IPushSender` reports `unconfigured` and
does nothing, and the permission banner does not render. A learner not getting a push is a
degraded feature; taking the application down over a missing optional key would be a far worse
outcome than the one it prevents. **`.env.example` has not been updated** — see O2.

**D57 — `IDatabase` grew a `delete` (F8.3).**
Its first, and the seam is a narrowing rather than an ORM, so widening it needs a reason.
Everywhere else in the product a learner's history is evidence and is kept: an attempt, a review
item, an exam answer. A dead push endpoint is not history — it is a browser that no longer
exists, and leaving it in the table means failing on every tick forever. 008's "no client delete"
is unchanged: this runs through the service client on a row the caller has already established
belongs to the learner.

**D58 — notification preferences are computed, not seeded (F8.5).**
005 stores a row per learner per type per channel and nothing creates them at signup. Sixteen
rows per account that nobody has an opinion about is a lot of storage for a default, so
`PreferenceDefaults` supplies the matrix and a stored row wins. The consequence is stated
because it is load-bearing: **an absent row means "on"**, so a learner who never opens the
screen still gets their daily reminder. Turning something off writes a row. `product_update` is
the one type off by default, being marketing rather than teaching.

**D59 — `ILearnerProfileRepository.listAll`, and why it is a compromise (F8.7).**
The hourly job's only read, and the only thing in the application that walks the whole table.
The *right* query is "learners whose `reminder_time` hour equals the current hour **in their own
timezone**" — `(now() at time zone timezone)::time` — which `IDatabase` cannot express and which
no repository seam of this shape ever will. Rather than widen the seam for one caller, the job
reads a capped roster and decides per learner in the domain, where the rule is testable. When
the cap bites, the answer is a Postgres function like 013, not a bigger number.

**D60 — `public/**` is excluded from lint (F8.9).**
`public/sw.js` is a service worker served verbatim. Its globals (`self` as a
`ServiceWorkerGlobalScope`, `clients`, `registration`) come from the `webworker` lib, which this
project does not load, and `allowJs` is off — so TypeScript sees every line as `any` and
type-aware lint produced 38 findings about the *absence of types* rather than about the code.
The linter is scoped to source; no rule was loosened and no rule was disabled in the file.

**D61 — F8.8 was written as a real test suite during the test pause (F8.8).**
The same call as D49 and D55. The idempotency *mechanism* shipped with F8.4 and F8.6; F8.8's
entire deliverable is `09-notifications.md`'s "proven by test", so there was nothing else to
build. Its fake notification store enforces the unique key the way Postgres does, which is the
only reason the suite means anything.

### Open — needs the user, not me

**O2 — `.env.example` is missing the three VAPID entries (F8.3).** `CLAUDE.md` makes a new
variable without an entry there a bug, and `.env.example` is explicitly editable under the env
rule. In this environment every shell command naming the file is refused by a hook, and working
around a guard the user has in place is not the right move. The three lines to add are:
`VAPID_PRIVATE_KEY=`, `VAPID_SUBJECT=` (a `mailto:` the push services can reach) and
`NEXT_PUBLIC_VAPID_PUBLIC_KEY=`, all optional — the app runs with push off. Generate a pair with
`npx web-push generate-vapid-keys`.

**O1 — `02-typescript-rules.md` still says `packages/config` base tsconfig.** That is a
leftover from the pre-restructure monorepo layout and contradicts the single-app rule in
`CLAUDE.md` §3 and `01-architecture.md`. Phase 1 will need one root `tsconfig.json` with the
same flag list. Amending the doc belongs to **F0.2** (confirm/amend the phase and feature
list), so it is recorded here and left untouched.

---

## Living document

When a decision changes, change it here in the same commit. A stale architecture record is
worse than none — it is a confident lie about the shape of the code.
