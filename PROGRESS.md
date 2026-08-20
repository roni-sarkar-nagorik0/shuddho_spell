# PROGRESS.md — feature tracker

**One feature at a time. Test it. Fix it if it fails. Only then move on.**

> **BUILD MODE — feature-first, verification paused. Set by the user 2026-08-19.**
> See section 0 of `CLAUDE.md`, which governs. Summary for this file:
> - The `Test:` line under every feature below is now an **acceptance criterion** — what the
>   feature must *do*. Build to it. You do not have to write it as a test.
> - `[x]` means **built and merged into `dev`**. No green suite required.
> - `[!]` is for a feature that could not be built, not for a failing test.
> - `/build` completes **five phases** per invocation.
> - Nothing in this file has been deleted. Paused lines are marked, not removed.

This file is the live state of the build. `BUILD-ORDER-COMPLETE.md` says what the phases are;
this file says exactly where you are inside them.

---

## How to read and update this file

| Mark | Meaning |
| --- | --- |
| `[ ]` | not started |
| `[~]` | in progress — **only ever one of these in the whole file** |
| `[x]` | done: built, tested, tests green, merged into `dev` — *paused → **built and merged into `dev`*** |
| `[!]` | **failed or blocked** — must be debugged and fixed before anything else starts |
| `[-]` | deliberately skipped or deferred — needs a one-line reason on the same row |

### Preflight — before the loop, every session

```bash
ls -la .env .env.local 2>/dev/null
```

Either file present → continue immediately; do not raise it again this session. Neither
present? Say so in one sentence, then keep building everything that does not need live
credentials. Formerly this said: copy `.env.example` to `.env.local` and fill sections 1
and 2. No feature starts without it. **Never read the file** — existence check only.

### The loop, every single time

1. Find the **first** `[ ]` feature in the topmost unfinished phase. That is the only feature
   you may work on.
2. Mark it `[~]` and update the **NEXT** pointer at the top of this file.
3. Build it. Only it.
4. Write and run its **test cases** — they are listed under every feature below.
   > **PAUSED.** Read the `Test:` line as the definition of done and **build to it**. Do not
   > author it as a test. Run `pnpm typecheck && pnpm lint` instead.
5. **If the tests fail:** mark it `[!]`, debug, fix, re-run. Do **not** start another feature.
   Do **not** move on. Do **not** leave it half-done for later.
   > **PAUSED for tests; live for builds.** `[!]` now means *the feature could not be built* —
   > typecheck or lint red, or a real blocker. That still stops everything until it is fixed.
6. When tests are green: mark it `[x]`, add the date, add a one-line note in the **Log**.
   > **PAUSED →** when it is **built and merged into `dev`**: mark `[x]`, add the date, add
   > the **Log** line.
7. Commit and push the feature branch (see `.claude/docs/15-git-workflow.md`).
8. Move the **NEXT** pointer to the following `[ ]`, then go back to 1 and do the next
   feature. **One whole phase per `/build`**, one feature at a time — a feature is picked only
   once the one before it is committed, pushed and merged into `dev`. When the phase has no
   `[ ]` left, run its exit gate, flip its **Status**, and stop. The next phase is the next
   `/build`.
   > **PAUSED →** **five whole phases per `/build`**, still one feature at a time, still in
   > order. When a phase has no `[ ]` left, flip its **Status** to `DONE` (no exit gate) and
   > roll straight into the next phase — until five are done, then stop.

### Absolute rules

- **Check the env file once, never read it**, and never block the build on it twice.
- **Never work on two features at once.** One `[~]` in this file, ever.
- **Never mark `[x]` without tests written and green.** "It works when I try it" is not a test.
  > **PAUSED** — `[x]` = built and merged into `dev`.
- **Never leave a feature incomplete.** A `[!]` blocks the whole build until it is `[x]`.
- **Never skip ahead** to a more interesting feature because the current one is awkward.
- **Never delete or weaken a test** to turn `[!]` into `[x]`.
  > **STILL LIVE.** Writing tests is paused; vandalising the 25 that already exist is not.
- A feature is done when it is built **and** tested **and** merged into `dev` — not before.
  > **PAUSED** — built **and** merged into `dev`.

---

## NEXT

> **Phase 7 · Exam engine — F7.13 next**
> Working on `feat/07-exam-engine`, cut from an up-to-date `dev`.
>
> **What Phase 5 leaves Phase 6**
> - `ISpeechScorer` is declared (F4.10) and **has no implementation**. Phase 6 is that, plus the
>   Bengali confusion map `07-speech-scoring.md` specifies as data rather than branches.
> - The whole write path is real: `IDatabase` → eleven repositories → 013/014's Postgres
>   functions. A pronunciation attempt should reach `record_lesson_attempt` like any other.
> - **Phoneme-dimension mastery is still never written.** Dictation credits rule families only,
>   correctly — the matrix's phoneme axis stays empty until pronunciation attempts land here.
> - `withApi` takes `paramsSchema` and `rateLimit` now. A speech endpoint is a write route and
>   wants a ceiling.
> - `Word` carries `ipa` but **no `phonemeIds`** — the `word_phonemes` join table exists in 002
>   and nothing reads it. Per-phoneme scoring needs a repository method that does.
>
> **Spotted, still open — none of these belonged to a Phase 5 feature**
> - `src/lib/logger.ts:14` still reads `process.env['LOG_LEVEL']` directly. Carried from Phase 3.
> - 008 still grants `authenticated` a table-wide update on `learner_profiles`, so a learner can
>   write their own `current_day_index`. F4.12 made that column meaningful and 014 now writes it
>   inside a transaction, which makes the hole worth more than it was.
> - `pnpm test` takes ~28s, most of it PGlite booting Postgres four times. Two full runs at once
>   contend badly enough to time out — worth one shared instance if it grows further.
> - The repo has never been prettier-clean: `pnpm format` rewrites files no feature touched.

## Phase 0 — Specification and architecture record
Branch `docs/00-architecture-record` · Status: `COMPLETE`

- [x] **F0.1** (2026-08-18) Write `ARCHITECTURE.md` — layer diagram, folder tree, token/port table, DB table list, unspecified-decisions section
  - Test: all five sections present; every port in `05-domain-model.md` appears in the token table
- [x] **F0.2** (2026-08-18) Confirm or amend the phase list and the feature list in this file
  - Test: every phase in `BUILD-ORDER-COMPLETE.md` has a matching section here
- [x] **F0.3** (2026-08-18) Confirm `.env.example` covers every variable the design needs
  - Test: every variable referenced in the docs appears in `.env.example` with a comment

---

## Phase 1 — App scaffold, tooling, contracts
Branch `feat/01-app-scaffold` · Status: `DONE` (12/14 built 2026-08-18; F1.9 and F1.11 each
have one part deferred to a later phase — see their rows)

- [x] **F1.1** (2026-08-18) Single Next.js 15 app at the repo root — one `package.json`, no monorepo, no separate server project
  - Test: `pnpm dev`, `build`, `lint`, `typecheck`, `test` all run; `git ls-files | grep -c "^apps/"` is 0
- [x] **F1.2** (2026-08-18) Strict tsconfig with every required flag
  - Test: an unchecked index access fails typecheck
- [x] **F1.3** (2026-08-18) ESLint flat config — `typescript-eslint` strict-type-checked, `import/no-cycle`, prettier
  - Test: a deliberate import cycle fails lint
- [x] **F1.4** (2026-08-18) `eslint-plugin-boundaries` — five zones: domain, application, infrastructure, presentation, app
  - Test: `domain → infrastructure` fails lint; `src/app → domain` fails lint (paste both, then remove)
- [x] **F1.5** (2026-08-18) The `type`-alias-on-object ban
  - Test: `type Foo = { a: string }` fails lint (paste output, then remove)
- [x] **F1.6** (2026-08-18) `src/contracts` — `IApiResponse<T>`, `IProblemDetails`, `IPaginatedResult<T>` with interface-first + `satisfies`
  - Test: a schema drifting from its interface fails typecheck
- [x] **F1.7** (2026-08-18) `src/lib/env.ts` — split server/public Zod schemas, `server-only` on the server half
  - Test: removing a required var stops boot and names it; importing the server env from a Client Component fails the build
- [x] **F1.8** (2026-08-18) `src/lib/supabase/` — session client + `server-only` service client
  - Test: grep finds exactly two `createClient` call sites; the service client cannot be imported client-side
- [x] **F1.9** (2026-08-19) `withApi` wrapper — **complete**, rate limiting landed via F4.10a
  - Shipped in Phase 1 and green: auth, Zod body/query, request id, pino, problem+json.
  - **Was deferred:** rate limiting needed the `IRateLimiter` port and a `rate_limits` table
    that Phase 2 did **not** ship. Re-opened as F4.10a and closed there on 2026-08-19 —
    012 ships the table and `consume_rate_limit`, and `withApi` takes a `rateLimit` option.
  - Test: a bad body returns problem+json with a stable `code`; a request id appears in the log line
- [x] **F1.10** (2026-08-18) `src/composition/` — per-request container factory
  - Test: a use case can be constructed with fakes and no container at all
- [x] **F1.11** (2026-08-20) Health, ready **and** `/api/v1/openapi.json` — complete via F5.9a
  - Shipped in Phase 1 and green: `/api/health` and `/api/ready`, both unauthenticated.
  - **Was deferred:** the OpenAPI doc must be generated from the v1 request/response schemas, and
    none existed until the presentation DTOs landed in F5.7. Re-opened as F5.9a and closed there.
  - Test: all three respond 200 unauthenticated; the OpenAPI doc is generated from the Zod schemas
- [x] **F1.12** (2026-08-18) Tailwind with the exact tokens and four fonts
  - Test: every token from `12-design-system.md` resolves in the Tailwind theme
- [x] **F1.13** (2026-08-18) `next-intl` with `en` + `bn` catalogues
  - Test: rendering in `bn` returns Bangla, not a missing-key fallback
- [x] **F1.14** (2026-08-18) Typed fetch client validating every response, throwing `ApiError` on mismatch
  - Test: a mocked malformed response throws `ApiError`, not a render crash
- [x] **F1.15** (2026-08-18) Vitest (unit + integration + component) and Playwright configured
  - Test: one example test of each kind runs green
- [x] **F1.16** (2026-08-18) Hosted Supabase setup + `.env.example` + README steps — **no Docker, no local stack**
  - Test: a clean checkout reaches a booting app using only the README

---

## Phase 2 — Database schema, migrations, RLS
Branch `feat/02-database-schema` · Status: `DONE` (exit gate run 2026-08-19)

- [x] **F2.1** (2026-08-18) `001_extensions` + `002_content_tables`
  - Applied by `pnpm db:migrate` over `DATABASE_URL` — plain SQL, forward-only, checksum ledger
    in `public.schema_migrations`. No Docker, no Supabase CLI.
  - Test: migration applies from empty; every table has id/created_at/updated_at
- [x] **F2.2** (2026-08-18) `003_learner_tables`
  - `learner_profiles` (anchored to `auth.users`) + `lesson_sessions`, `attempts`,
    `review_items`, `mastery_records`, `streak_records`. `profile_id` is denormalised onto
    every child so an RLS policy in 008 never has to join to find the owner.
  - Test: every learner table has `profile_id` with `on delete cascade`
- [x] **F2.3** (2026-08-18) `004_exam_tables`
  - `exam_definitions`, `exam_sections`, `exam_attempts`, `exam_questions`, `exam_answers`.
    A partial unique index allows one `in_progress` attempt per learner per exam, and
    `exam_answers` is unique per question, so a replayed save updates rather than duplicates.
  - Test: score columns are `numeric`, never `float`
- [x] **F2.4** (2026-08-18) `005_notification_tables` + `006_certificates`
  - `notifications`, `notification_preferences`, `push_subscriptions`, `certificates`.
    `scheduled_for` is the window the dispatcher aimed at, so `(profile_id, type,
    scheduled_for)` stays stable across a platform retry. `email` is legal in both channel
    constraints and written by nothing — the v2 door, held open with no migration.
    A certificate is revoked by update, never by delete: it must still verify, as revoked.
  - Test: the notification idempotency unique key `(profile_id, type, scheduled_for)` exists
- [x] **F2.5** (2026-08-18) `007_indexes`
  - Five indexes created; `exam_answers (question_id)` and `exam_questions (attempt_id,
    section_code, order_index)` were already btrees behind `unique (...)` from 004, so they
    are commented rather than duplicated. Every index carries `comment on index` naming its
    query, and the catalogue test enforces that for any non-constraint index added later.
  - Test: each index has a comment naming the query it serves; `explain` uses it
- [x] **F2.6** (2026-08-18) `008_rls_policies`
  - `current_profile_id()` (security definer, pinned search path) resolves the caller once;
    every learner table gets the same select/insert/update pair, no delete anywhere. Content
    is readable by any authenticated user and writable by none. `exam_questions` gets no
    policy and no grant — refused at the privilege layer. F2.7 kept it that way (see D15).
    Public certificate verification ships as a view, per 006's note.
  - Test: **the two-user script** — user A cannot read B's attempts, review items, exam attempts, answers or notifications
- [x] **F2.7** (2026-08-18) `correct_answer` protection (column policy or view)
  - No new SQL: 008 grants the client nothing on `exam_questions`, so the column is refused
    at the privilege layer — stricter than a column policy or a view, both of which imply a
    grant. A client view would also have no consumer (the API reads via the service role),
    and the forward-only checksum in `scripts/migrate.mjs` forbids editing 008. See D15.
  - Shipped instead: the lock. `has_column_privilege` false for every client role on every
    column; no view carries the column; a static sweep fails any future migration that
    grants, polices or views it.
  - Test: a client-role select of `correct_answer` is denied
- [x] **F2.8** (2026-08-19) `009_functions_triggers` — `updated_at`, profile-on-signup, session-completion function, exam auto-submit
  - `updated_at` attached by catalogue loop, so a table added in Phase 8 cannot be the one
    without a trigger. Signup trigger is `security definer` and idempotent. 
    `complete_lesson_session` is the `IUnitOfWork` boundary only — jsonb in, four tables
    written atomically, no domain arithmetic (D16). Auto-submit marks `submitted`, never
    graded, and is pg_cron-guarded so a database without the extension still migrates.
    All four functions revoked from the client roles (D17).
  - Test: inserting into `auth.users` creates a `learner_profiles` row
- [x] **F2.9** (2026-08-19) `010_seed_reference` — 44 real phonemes, 24 real rule families
  - 12 vowels, 8 diphthongs, 24 consonants, each annotated for a Bengali speaker: a null
    `bangla_equivalent` means Bangla lacks the sound, and the substitution column then says
    what learners produce instead. 24 rule families, each with three examples and two
    counterexamples that are genuinely counter — the counterexample is the lesson.
    Idempotent on the natural keys (`symbol`, `code`), so a re-run corrects drift instead
    of duplicating. The migration asserts its own completeness by naming every symbol and
    code, which catches a mistyped IPA character that a count never could (D19).
  - Test: counts are exactly 44 and 24; no placeholder text
- [x] **F2.10** (2026-08-19) Hand-written row interfaces in `infrastructure/`
  - One `I*Row` per table, 22 of them, across the nine modules that own the tables. `jsonb` is
    typed `Json` and nothing narrower — the database guarantees well-formed JSON and no more,
    and narrowing is the mapper's job. Verified against the Postgres catalogue read out of
    PGlite rather than against the Supabase CLI, which is not installed by design and needs
    live credentials: `gen types` reads that same catalogue and applies the same mapping, so
    this is the CLI's rule without the CLI, plus column order, `readonly`, file naming and
    placement (D20).
  - Test: `supabase gen types` output matches them; no row interface outside `infrastructure/`

---

## Phase 3 — Authentication (Google only)
Branch `feat/03-google-auth` · Status: `DONE` (12/12, 2026-08-19). Exit gate 7/7, with three
items proven below the level they are written at — see **Completed** in
`BUILD-ORDER-COMPLETE.md`.

- [x] **F3.1** (2026-08-19) `@supabase/ssr` cookie session client
  - Test: the session cookie is httpOnly
- [x] **F3.2** (2026-08-19) `/login` — one heading, one line, one Google button
  - Test: the page contains exactly one button and zero input elements
- [x] **F3.3** (2026-08-19) `/auth/callback` code exchange + new-vs-existing routing
  - Test: a new profile lands on `/onboarding`, an existing one on `/dashboard`
- [x] **F3.4** (2026-08-19) Session-refresh middleware and route protection
  - Test: an unauthenticated request to `/dashboard` redirects to `/login`
- [x] **F3.5** (2026-08-19) `useSession()` + `requireUser()`
  - Test: `requireUser()` throws/redirects with no session
- [x] **F3.6** (2026-08-19) `withApi({ auth: 'required' })` session resolution
  - Test: no session → 401 problem+json; expired cookie → refreshed or 401, never 500; tampered cookie → 401
- [x] **F3.7** (2026-08-19) Protected-by-default routing; `auth: 'public'` as the explicit opt-out
  - Test: a protected handler 401s without a session; a public one returns 200
- [x] **F3.8** (2026-08-19) `CRON_SECRET` bearer check for `/api/cron/*`, constant-time compare
  - Test: a request without the secret → 401; the secret never appears in a log line
- [x] **F3.9** (2026-08-19) `BootstrapProfileUseCase`, idempotent
  - Test: two concurrent first requests produce exactly one profile, no 500
- [x] **F3.10** (2026-08-19) `GET /api/v1/me`
  - Test: returns profile + program position for a valid token
- [x] **F3.11** (2026-08-19) No email/password path exists
  - Test: `grep -ri "password\|magic.link\|signInWithOtp" src/` returns nothing in app code
- [x] **F3.12** (2026-08-19) Identity comes only from the session
  - Test: a body carrying another user's `profileId` is ignored; the session's profile is used

---

## Phase 4 — Domain and application layers
Branch `feat/04-domain-application` · Status: `DONE` (16/16, 2026-08-19).
**Exit gate not run — paused by standing instruction 2026-08-19** (`CLAUDE.md` section 0).
Four of its items were nonetheless proven, by probes kept deliberately: the engine's five
mandatory cases, all nine error tags reachable from real wrong answers, `consume_rate_limit`,
and the 40→25 review queue. Coverage was not measured and most use cases have no unit test.

- [x] **F4.1** (2026-08-19) Value objects — `DayIndex`, `ScorePercent`, `IpaTranscription`, `Track`, `ErrorTag`
  - Test: each rejects out-of-range construction
- [x] **F4.2** (2026-08-19) Content entities — `Phoneme`, `Word`, `RuleFamily`, `SentenceItem`, `ProgramDay`
  - Test: construction from valid data; readonly enforced at compile time
- [x] **F4.3** (2026-08-19) `LearnerProfile` + `LessonSession.advanceStage()`
  - Test: legal order passes; skipping or reversing a stage is a domain error
- [x] **F4.4** (2026-08-19) `ReviewItem.recordResult()` — the interval ladder
  - Test: correct advances one rung; rung 4 stays 4; wrong resets to rung 0 from every rung
- [x] **F4.5** (2026-08-19) `ReviewSchedulingPolicy` behind `IReviewSchedulingPolicy`
  - Test: `1,3,7,16,35` appear nowhere outside the policy (grep)
- [x] **F4.6** (2026-08-19) Mastery rule — 3 correct on 3 **different calendar days**
  - Test: two correct same day counts once; three across three days → `isMastered`
- [x] **F4.7** (2026-08-19) `StreakRecord.registerActivity()` with timezone day boundaries
  - Test: a UTC+6 learner at 23:50 local; a learner who changes timezone mid-streak
- [x] **F4.8** (2026-08-19) `MasteryCalculator` and `ErrorTagger`
  - Test: each named tag (`DOUBLE_CONSONANT`, `SILENT_LETTER`, `ARTICLE_MISSING`, `V_W_SUBSTITUTION`, …) is produced by a real wrong answer
- [x] **F4.9** (2026-08-19) Repository ports + Symbol tokens (8 ports)
  - Test: every port has a token; no concrete class is injected anywhere
- [x] **F4.10** (2026-08-19) Application ports — `IClock`, `IIdGenerator`, `ISpeechScorer`, `IUnitOfWork`
  - Test: no `Date.now()` / `new Date()` outside a clock adapter (grep)
- [x] **F4.10a** (2026-08-19) `IRateLimiter` port + the `rate_limits` table, then finish `withApi`'s rate limiting
  - **Carried from F1.9**, deferred out of Phase 1 because neither the port nor the table existed.
    Phase 2 did not ship `rate_limits`, so this feature adds the migration as well as the port.
  - Test: the 61st request in a 60-second window returns 429 problem+json with `RATE_LIMITED`;
    the window resets; two learners do not share a bucket
- [x] **F4.11** (2026-08-19) Program use cases — `GetProgramOverview`, `GetProgramDay`
  - Test: unit tests with in-memory fakes, no Nest `TestingModule`
- [x] **F4.12** (2026-08-19) Lesson use cases — `StartLessonSession`, `AdvanceLessonStage`, `CompleteLessonSession`
  - Test: stage out of order rejected; a session resumed the next day works
- [x] **F4.13** (2026-08-19) Attempt use cases — `SubmitDictationAttempt`, `SubmitConstructionAttempt`
  - Test: an attempt on a word not in today's lesson is rejected
- [x] **F4.14** (2026-08-19) Review use cases — `GetDueReviewItems`, `SubmitReviewAttempt`
  - Test: 40 due items → 25 returned, most overdue first, ties by lowest accuracy
- [x] **F4.15** (2026-08-19) Progress use cases — `GetMasterySnapshot`, `GetProgressSummary`, `GetLearnerDashboard`
  - Test: unit tests with fakes; coverage on `domain` + `application` ≥ 90%

---

## Phase 5 — Infrastructure and presentation wiring
Branch `feat/05-infrastructure` · Status: `DONE` (9/9, 2026-08-20). F1.11 closed with F5.9a.
**Exit gate not run — paused by standing instruction 2026-08-19** (`CLAUDE.md` section 0).
Five of its seven items happen to be proven by sweeps and probes kept while building; the two
that are not are named on the phase's **Completed** line in `BUILD-ORDER-COMPLETE.md`.

- [x] **F5.1** (2026-08-19) Repositories use the `server-only` service client and nothing else
  - Test: grep finds no `createClient` outside `src/lib/supabase/`
- [x] **F5.2** (2026-08-19) Row↔entity mappers, both directions
  - Test: round-trip mapping is lossless; no row interface escapes `infrastructure/`
- [x] **F5.3** (2026-08-19) Repository implementations (8 ports)
  - Test: integration tests against real local Supabase, seeded and torn down per suite
- [x] **F5.4** (2026-08-19) `IUnitOfWork` over a Postgres function for session completion
  - Test: a mid-write failure rolls back attempts, review items, mastery and streak together
- [x] **F5.5** (2026-08-19) Postgres error-code mapping (23505 / 23503 / 40001 + one retry)
  - Test: each code produces its typed domain error; 40001 retries exactly once
- [x] **F5.6** (2026-08-19) Batched reads — no N+1 on the dashboard
  - Test: a query-count assertion on `GetLearnerDashboard`
- [x] **F5.7** (2026-08-19) Program, lessons and review handlers via `withApi` + three-line route re-exports
  - Test: each handler invoked directly with a constructed `Request`; no business conditional in any handler; `runtime = 'nodejs'` declared
- [x] **F5.8** (2026-08-19) Server Component read path calls the same use cases
  - Test: the dashboard Server Component and `GET /api/v1/progress/summary` run one implementation, not two
- [x] **F5.9a** (2026-08-19) `/api/v1/openapi.json`, generated from the v1 Zod schemas
  - **Carried from F1.11**, deferred out of Phase 1 because no v1 schema existed to generate from.
    The presentation DTOs land in F5.7, so this comes after them.
  - Test: responds 200 unauthenticated; every v1 route appears; the doc is generated from the
    Zod schemas, never hand-maintained alongside them

---

## Phase 6 — Speech scoring
Branch `feat/06-speech-scoring` · Status: `DONE` (8/8, 2026-08-20). Exit gate **not run** — paused by
standing instruction 2026-08-19. F6.7's 42-case suite is green (75/75) and covers five of the
five gate items that are about behaviour; the sixth, "no audio reaches the server unless the
learner opted into storage", is enforced by the request schema having no audio field and was
not proven by a sweep.

- [x] **F6.1** (2026-08-20) G2P lookup stored in the `words` table
  - Test: every seeded word resolves to a phoneme sequence
- [x] **F6.2** (2026-08-20) `BengaliConfusionMap` as data
  - Test: all required pairs present — v↔w, θ→t, ð→d, z→j, ʃ↔s, æ→e, epenthetic /sk/ /sp/ /st/, dropped final clusters, stress
- [x] **F6.3** (2026-08-20) Normalised Levenshtein similarity
  - Test: identical → 1.0; empty → 0; known distances match expected values
- [x] **F6.4** (2026-08-20) Phoneme-level comparison with partial credit
  - Test: a single confused phoneme scores partial, not zero
- [x] **F6.5** (2026-08-20) The 50/50 blend and the ≥65 clamp
  - Test: a near miss on **every** confusion pair scores 65–90, never 0
- [x] **F6.6** (2026-08-20) `IPronunciationScore` with `perPhoneme` and named diagnoses
  - Test: every diagnosis carries `expected`, `heard`, `articulationFix`
- [x] **F6.7** (2026-08-20) The ≥40-case table-driven suite
  - Test: correct · each confusion pair · completely wrong · empty transcript · homophone · extra words
- [x] **F6.8** (2026-08-20) Pronunciation attempt endpoint + mastery write-through
  - Test: an attempt updates per-phoneme `mastery_records`; no audio reaches the server

---

## Phase 7 — Exam engine
Branch `feat/07-exam-engine` · Status: `NOT STARTED`

- [x] **F7.1** (2026-08-20) Exam entities + `ExamStatus` union
  - Test: illegal status transitions rejected
- [x] **F7.2** (2026-08-20) `ExamScoringService` — pure, no I/O
  - Test: section weights 35/20/30/15 applied; boundary case exactly at the pass mark
- [x] **F7.3** (2026-08-20) `ExamBlueprintService` — seed-deterministic selection
  - Test: the same seed produces the same questions; weak items are preferred
- [x] **F7.4** (2026-08-20) `StartExamAttempt` + `serverDeadlineAt`
  - Test: the deadline is set once and never extended, including on resume
- [x] **F7.5** (2026-08-20) `SaveExamAnswer` / `FlagExamQuestion`
  - Test: a write past the deadline → 409 `EXAM_TIME_EXPIRED`
- [x] **F7.6** (2026-08-20) `SubmitExamSection` — one-way locking
  - Test: a submitted section cannot be reopened by any endpoint
- [x] **F7.7** (2026-08-20) Attempt limits and cooldowns
  - Test: a 4th `milestone1` attempt → 409 `EXAM_ATTEMPTS_EXHAUSTED`; a retake inside cooldown → 409 with remaining time
- [x] **F7.8** (2026-08-20) `GetActiveExamAttempt` — crash-safe resume
  - Test: refresh at the 30-second mark resumes with server-computed remaining seconds
- [x] **F7.9** (2026-08-20) No `correctAnswer` leak
  - Test: a snapshot over **every** exam response body asserts its absence before submission
- [x] **F7.10** (2026-08-20) `SubmitExamAttempt` — pass advances, fail prescribes
  - Test: a pass advances `currentDayIndex`; a fail writes drills into `review_items`
- [x] **F7.11** (2026-08-20) `GetExamResult` / `GetExamAnswerReview`
  - Test: review is unreachable before submission
- [x] **F7.12** (2026-08-20) `GetExamReadiness`
  - Test: returns a predicted score and exactly three costliest topics
- [ ] **F7.13** `pg_cron` auto-submit for abandoned attempts + `/api/cron/exam-autosubmit` backstop
  - Test: an abandoned attempt is submitted and no longer blocks a retake; the cron route 401s without the bearer secret; a double-fire does not double-submit
- [ ] **F7.14** The full attack suite (`/exam-attack`)
  - Test: all 11 attacks rejected or resumed correctly

---

## Phase 8 — Notifications
Branch `feat/08-notifications` · Status: `NOT STARTED`

> **In-app and web push only. The app sends no email.** No `IMailer`, no Resend, no SMTP,
> no `RESEND_API_KEY`. `email` stays in the channel union and the DB constraint so v2 needs
> no migration. See `09-notifications.md`.

- [ ] **F8.1** Notification entities + type/channel unions
  - Test: construction and validation of all 8 types
- [ ] **F8.2** `NotificationPolicy` — channels + quiet hours
  - Test: quiet hours **spanning midnight** (22:00→07:00) suppress at 02:00, allow at 12:00
- [ ] **F8.3** `IPushSender` (VAPID) with self-cleaning
  - Test: a 410 response deletes the subscription without throwing
- [ ] **F8.4** `IInAppNotifier` — writes a `notifications` row
  - Test: a dispatch writes exactly one row; unread counts update
- [-] **F8.4b** `IMailer` + email channel — **deferred to v2, the app sends no email**
  - Test: n/a. Gate instead: no mail dependency in `package.json`; `grep -ri "resend\|nodemailer\|smtp" src/` is empty
- [ ] **F8.5** Preference and list use cases
  - Test: a learner can only read and update their own preferences
- [ ] **F8.6** Dispatch use cases (6 types), in-app + push only
  - Test: each respects the policy service; `SendWeeklyReport` sends no email; a preference requesting `email` is never selected
- [ ] **F8.7** `/api/cron/notifications` — hourly, timezone-aware dispatch
  - Test: a UTC+6 learner with a 20:00 reminder fires at 20:00 local, exactly once; the route 401s without the bearer secret; a platform retry does not double-send
- [ ] **F8.8** Idempotency on `(profile_id, type, scheduled_for)`
  - Test: a retried dispatch produces one row and one send
- [ ] **F8.9** Service worker + inline permission banner
  - Test: the prompt is a banner, never a modal; a denied permission is a recoverable state
- [ ] **F8.10** Bell popover, toasts, preferences table (**In-app / Push** columns only)
  - Test: component tests for unread counts and channel toggles; no Email column rendered

---

## Phase 9 — Content pipeline and seeding
Branch `feat/09-content-pipeline` · Status: `NOT STARTED`

- [ ] **F9.1** `content/` Zod schemas + build-time validation
  - Test: a malformed entry fails the build naming the exact file and line
- [ ] **F9.2** `pnpm content:seed` — validate, diff, apply only changes
  - Test: a second run is a no-op diff
- [ ] **F9.3** 44 phonemes with real articulation notes
  - Test: count is 44; `banglaEquivalent: null` always has a `commonBengaliSubstitution`
- [ ] **F9.4** 24 rule families — statement + 3 examples + 2 counterexamples
  - Test: count is 24; every family has 3 and 2
- [ ] **F9.5** Week 1 content
  - Test: validator green; counts reported; Bangla is Bangla script; ≥2 misspellings per word
- [ ] **F9.6** Week 2 content
  - Test: as above
- [ ] **F9.7** Week 3 content
  - Test: as above
- [ ] **F9.8** Week 4 content
  - Test: as above
- [ ] **F9.9** Final totals and the `ipaNeedsReview` report
  - Test: 1,240 words, 560 sentence items, no duplicate `text`, flagged list reported

---

## Phase 10 — Web shell and core components
Branch `feat/10-web-shell` · Status: `NOT STARTED`

- [ ] **F10.1** App shell — 232px sidebar collapsing to 56px, 48px top bar, 1280px grid
  - Test: collapse state persists; keyboard reachable
- [ ] **F10.2** `PhonemeStrip`
  - Test: syllable dividers, 22px cells tinted by learner mastery, Bangla line, mono stat line; 3 states in Storybook
- [ ] **F10.3** `MasteryMatrix`
  - Test: renders 44 cells **and** 24 cells from the same component via `dimension`; tooltips; drill action
- [ ] **F10.4** `DataTable` — sticky header, pinned columns, cursor pagination, 32px rows
  - Test: pagination with a cursor; keyboard navigation
- [ ] **F10.5** Primitives — `StatCell`, `PanelHeader`, `HeatCell`, `MonoValue`, `StatusBadge`, `Sparkline`
  - Test: tabular numerals on every numeric primitive
- [ ] **F10.6** Overlays — `Toast`, `Popover`, `Drawer`, `ConfirmDialog`
  - Test: focus trap, Escape closes, focus returns to the trigger
- [ ] **F10.7** TanStack Query wiring + optimistic answer saving
  - Test: **exam writes are not retried**; other reads retry
- [ ] **F10.8** i18n key-parity CI check
  - Test: deleting a `bn` key fails CI (paste output, restore key)
- [ ] **F10.9** Accessibility baseline
  - Test: focus rings 2px secondary-500 / 2px offset; `prefers-reduced-motion` respected; no colour-only cue

---

## Phase 11 — Learning screens
Branch `feat/11-learning-screens` · Status: `NOT STARTED`

- [ ] **F11.1** `/dashboard`
  - Test: renders with zero data and with full data; no N+1 on the API call
- [ ] **F11.2** `/program`
  - Test: 28 rows grouped by week with milestone rows; expandable day rows
- [ ] **F11.3** `/lesson/[day]` shell + five-stage tracker
  - Test: stage order enforced by the server, not just the UI
- [ ] **F11.4** Learn stage
  - Test: `PhonemeStrip` renders per word; audio plays
- [ ] **F11.5** Dictate stage — the letter tiles
  - Test: keyboard input · auto-advance · backspace moves back **and** clears · arrows navigate · **paste blocked** · Enter submits · fully operable with no mouse
- [ ] **F11.6** Speak stage — the mic flow
  - Test: unsupported browser renders the self-assessment fallback, never a dead button; permission-denied is recoverable
- [ ] **F11.7** Build stage — sentence chips
  - Test: pointer-event reordering **and** full keyboard reordering as a first-class path
- [ ] **F11.8** Audio manager
  - Test: a new play cancels the previous utterance — no overlap, ever
- [ ] **F11.9** `/practice`
  - Test: drills are selected by actual weakness, not at random
- [ ] **F11.10** `/weak-spots`
  - Test: the spaced-repetition schedule axis matches `review_items.due_at`
- [ ] **F11.11** `/library`
  - Test: filters, column control, CSV export, detail drawer; cursor pagination
- [ ] **F11.12** `/progress`
  - Test: accuracy over time with milestone markers; both mastery matrices; activity heatmap

---

## Phase 12 — Exam and marketing screens
Branch `feat/12-exam-marketing-screens` · Status: `NOT STARTED`

- [ ] **F12.1** `/exams` catalogue
  - Test: lock state and readiness reflect the server, not local state
- [ ] **F12.2** `/exams/[code]` lobby + system check
  - Test: the begin button is gated on **both** the checkbox and the mic/audio check
- [ ] **F12.3** `/exams/attempt/[id]` runtime shell
  - Test: no navigation out; `beforeunload` warning active
- [ ] **F12.4** The countdown
  - Test: driven by server remaining seconds; `secondary-500` at 5:00, `tertiary-500` at 0:60, each with `aria-live`
- [ ] **F12.5** Question navigator
  - Test: answered / current / flagged / blank states; fully keyboard operable
- [ ] **F12.6** Refresh and resume
  - Test: a refresh mid-attempt loses no answers and no elapsed time
- [ ] **F12.7** `/exams/result/[id]` — pass and fail variants
  - Test: the fail variant renders its prescription block
- [ ] **F12.8** `/exams/review/[id]`
  - Test: master-detail with diffs; unreachable before submission
- [ ] **F12.9** `/certificate/[id]` + public verification
  - Test: verification works unauthenticated
- [ ] **F12.10** `/` marketing landing
  - Test: Server Component, statically rendered, **Lighthouse ≥95 performance / 100 accessibility** — report attached
- [ ] **F12.11** Inline dictation demo on the hero
  - Test: it actually works, unauthenticated
- [ ] **F12.12** `/onboarding`
  - Test: goal → minutes → track → reminder time → diagnostic; resumable if abandoned

---

## Phase 13 — Hardening and delivery
Branch `feat/13-hardening` · Status: `NOT STARTED`

- [ ] **F13.1** Coverage to the floor; fix the weakest three modules
  - Test: `domain` + `application` ≥ 90%, per-module numbers reported
- [ ] **F13.2** Playwright — Google sign-in → dashboard
- [ ] **F13.3** Playwright — a complete day-12 lesson
- [ ] **F13.4** Playwright — a full `milestone2` exam **including a mid-exam refresh**
- [ ] **F13.5** Playwright — a failed exam producing its drill prescription
- [ ] **F13.6** Security pass — RLS two-user script, `correct_answer` snapshot, rate limits, headers + CSP, no secret in the bundle
- [ ] **F13.7** Performance pass — index review, N+1 query counting, p95 ≤ 200ms reads, bundle budget
- [ ] **F13.8** Observability — request ids, Sentry both apps, `/metrics`
- [ ] **F13.9** CI — typecheck, lint, unit, integration (Supabase service container), e2e, build
- [ ] **F13.10** Deployment config with migrations as a gated step
- [ ] **F13.11** `README.md` + `DECISIONS.md`
- [ ] **F13.12** The honest closing report — what is incomplete, what is fragile, what is next

---

## Deferred to v2

Out of scope for this build. Do not start these, and do not leave stubs for them.

| Item | Why | What is already in place |
| --- | --- | --- |
| Email channel / `IMailer` / Resend | The app sends no email. Notifications run on in-app + web push. | `email` stays in the `NotificationChannel` union and the DB check constraint, so v2 needs no migration. `RESEND_API_KEY` and `EMAIL_FROM` stay commented out in `.env.example` and absent from the Zod schema. |

---

## Log

Newest first. One line per finished feature: date · id · what · test result.

| Date | Feature | What landed | Tests |
| --- | --- | --- | --- |
| 2026-08-20 | F7.12 | The three topics are ranked by **expected loss, not by accuracy**, and those are different orders — that difference is the whole value of the feature. A rule family at 40% inside a 30%-weighted section costs more of the final mark than a phoneme at 20% inside a 20%-weighted one, so telling a learner to go and drill the phoneme would be advice that does not move the number they care about. Each topic's share is its dimension's weight divided by how many topics have been measured in it: a learner with 44 measured phonemes has each accounting for a forty-fourth of the pronunciation section, and skipping that would rank one phoneme above a whole section's worth of rules. A previous attempt at **this** exam outweighs general mastery 60/40 — sitting the paper is the best evidence about the paper — but it does not erase it, because somebody who failed on Monday and practised all week is not still that score. With nothing measured, the prediction is 50, not 0: the honest guess is the middle, and zero would tell a new learner they are certain to fail. Fewer than three topics come back only for an account measured on fewer than three dimensions — padding the list would be inventing advice. `08` calls this the thing that makes the lobby honest instead of decorative, and the field is named `predictedScorePercent` for the same reason: a lobby saying *Ready!* to somebody who will score 51% is worse than one saying nothing, because they will believe it | typecheck, lint green · exam sweeps + openapi 15/15 |
| 2026-08-20 | F7.11 | The review is **the only route in the API that returns correct answers**, and the guard sits in the use case rather than the handler: a check in a handler protects one handler, a check before the read protects the data — an unsubmitted attempt never loads its answer key into memory at all, and the ordering (ownership → submission → read) is what makes that true rather than a `throw` further down keeping it off the wire. `submitted` counts as finished alongside `passed`/`failed`, because the diagnostic ends there by design and refusing a learner their own placement result would refuse the only thing that exam produces. Two routes rather than one: the result screen must not download 150 questions and their answer key to show one number. **F7.9's sweep needed amending, and the amendment is the rule stated in full, not a hole in it** — rule 3 bounds the key by *time* ("every other exam route must not, **before submission**"), so the review DTO and its use case are listed together as `AFTER_SUBMISSION_ONLY`, with a **new assertion** that the gate exists and that it precedes the read. Neither file is safe alone: a DTO with the field and no gate is a leak, a gate protecting nothing is theatre | typecheck, lint green · exam sweeps + openapi 15/15, now 10 assertions in the leak suite |
| 2026-08-20 | F7.10 | Four responsibilities, four pure services, one write. `ExamAnswerMarker` decides right or wrong, `ExamScoringService` weights, `ExamDefinition.passes()` decides the outcome, `ExamPrescriptionService` turns a failure into work — and migration **016** writes all of it in one transaction, because every partial outcome is worse than the failure that caused it: marks with no outcome leave the attempt stuck `in_progress` past its deadline **blocking the retake the learner earned**; an outcome with no advance leaves somebody who passed still on day 7 tomorrow; a fail with no prescription is rule 8's "just a number". 016 is **idempotent by construction** — it returns early unless the row is still `in_progress` — which is what rule 9 needs when the cron backstop fires on an attempt the learner has just handed in. Rule 8's drills go through the **same review ladder as every other wrong answer**, not a bespoke exam-drill path: a word missed in an exam and the same word missed in a lesson are one gap, and two schedulers would give it two due dates. Pronunciation earns **partial** points where the other types do not, and the asymmetry is the product's — a spelling is right or not, a pronunciation is a distance, and marking `wery` zero in an exam would be Phase 6's mistake made twice. Submission is deliberately **not** deadline-guarded: rule 2 governs answers and has already stopped them changing any, while an out-of-time paper is submitted rather than lost. `IPronunciationJudge` is declared in the exams **domain** and never names `ISpeechScorer`; one adapter connects them and caches the 44-phoneme inventory per request, so a 30-item pronunciation section reads it once, not thirty times. **The F7.9 sweep did its job mid-lap** — it failed on `exam-answer-marker.ts` naming the answer key, which is legitimate, so the file joined the list with its reason rather than the rule being loosened | typecheck, lint green · exam sweeps + openapi 14/14 |
| 2026-08-20 | F7.9 | Asserted **two ways**, because either alone is escapable. The behavioural half serialises every shape an exam endpoint returns before submission — the attempt view that start, resume and reconnect all share, an offered question, the saved-answer echo, the section-submit progress — and looks for a distinctive planted answer in the JSON, which catches a leak through a nested object or a spread. The structural half sweeps the source, which catches a leak in a shape nobody has written a case for yet: the Phase 12 endpoint added by somebody who has not read this file. One assertion exists purely to keep the rest honest — **the entity that does hold the key must still hold it**, because if `correctAnswer` quietly stopped being populated every other assertion would pass while proving nothing. Two sweep rules rather than one growing allowlist: response-shaping locations (`presentation/`, `application/dto/`, `application/services/`, the routes) may name it **never, no exceptions**, and everywhere else in the module is held against the seven-file generation-and-marking path, each entry carrying its reason. A fourth assertion fails if a listed file *stops* naming it, so the list cannot go stale and quietly widen. Mutation-probed: a planted `correctAnswer` in a response DTO fails both sweeps | `pnpm exec vitest run` on this file: **9/9**, planted leak caught and removed · typecheck, lint green |
| 2026-08-20 | F7.8 | Rule 6 — a crash loses nothing — and the reason it works is that **there was never anything in the tab that mattered**: the attempt, the section, the answers and the deadline are all columns. The elapsed time is deducted because it is never *added*: `remainingSeconds` is `serverDeadlineAt − now`, so a learner away ten minutes returns to ten fewer, and an exam whose clock stopped when the tab closed would be an exam with no time limit. Start and resume now share **one** view builder, because two functions that agree today are how a resume comes to report the deadline differently from the start — a bug that costs a learner time and is invisible until it does. The read is deliberately **not** a write: an expired attempt is returned with zero seconds rather than being auto-submitted here, because a read that writes behaves differently under a refresh, and finishing abandoned attempts belongs to the cron backstop. `null` rather than 404 when nothing is running — the runtime asks "am I mid-exam?" on every load and "no" is an answer, not a missing resource | typecheck, lint green · openapi + api sweeps 59/59 with the new route registered |
| 2026-08-20 | F7.7 | `ExamEligibilityPolicy` returns a **union of three answers**, not a boolean with two nullable fields beside it: "never again" and "not for another six hours" are different news, and a client that cannot tell them apart shows the wrong screen. Two problem codes for the same reason — `EXAM_ATTEMPTS_EXHAUSTED` is terminal, `EXAM_COOLDOWN_ACTIVE` carries the wait, and rule 5 asks for the remaining time **in the problem detail** because "come back later" with no number reads as a bug. Ordering inside `StartExamAttempt` is the subtle part: eligibility is evaluated **after** the resume path, never before. Checking first would refuse a learner their own live attempt on the third try at a three-attempt exam — they are not starting a fourth, they are coming back to the one they are sitting. The cooldown runs from the most recent `submittedAt` and **not** from the highest attempt number: an attempt abandoned and auto-submitted by the cron backstop finishes at its deadline, which can fall after a later attempt was created, and the cooldown is about when the learner last sat an exam. Remaining seconds round **up**, because reporting zero while still refusing the start is the one answer a client cannot act on. Pure, so the case that matters — a retake one second early — is a table of numbers rather than a test that waits twenty-four hours | typecheck, lint green — tests paused |
| 2026-08-20 | F7.6 | Rule 4 says a submitted section cannot be reopened **by any endpoint** — "not an admin one, not a debug one" — and the way that is kept is not a check in this use case. It is that `ExamAttempt` has **no method that lowers `currentSectionIndex`**: there is nothing for a future endpoint to call, so writing the endpoint does not create the hole; somebody would have to add the method first, in the entity, where the rule is written down and visible. The guard here is a narrower and different one: the code submitted must be the section the attempt is actually on. Behind is a replay (a double-click, a lost response) and ahead would lock the section in between unsat — both are `SectionNotCurrentError`, both 409, because both leave the paper describing something that did not happen. Ordering inside the use case matters and is deliberate: **writability is checked first**, so a learner whose time ran out is told the paper closed rather than that they picked the wrong section | typecheck, lint green · openapi + api sweeps 59/59 with the new route registered |
| 2026-08-20 | F7.5 | `attempt.assertWritable(now)` is the whole feature, and it fails in **two distinguishable ways** because the client's reaction differs: a finished attempt is an illegal transition (409 `CONFLICT`, a replayed request, no action needed) and an overdue one is `EXAM_TIME_EXPIRED` (409, its own code, and the runtime must stop the clock and stop accepting input). A generic conflict for both would leave the client unable to tell them apart. The deadline compared against is **the stored one**, and there is no argument to either use case that could carry a client's opinion of the time — which is what makes the "move the system clock forward mid-attempt" attack a non-event rather than a defended one. Every response carries `remainingSeconds` from the server clock, so the runtime resynchronises on each save instead of trusting an hour of its own interpolation. Flagging is **not** merged into saving despite writing the same row: a combined shape would have to decide what an absent `submittedValue` means, and "clear the answer" and "leave it alone" are both plausible readings — the ambiguity a discriminated union exists to remove. `ignoreDuplicates: false` on the upsert is deliberate the other way from the profile bootstrap: a conflict here is a learner changing their mind, and ignoring it would keep the first answer while the screen showed the second. The rate ceiling is high (300/min) because `13-frontend.md` forbids retrying exam writes — a limit that bit here would lose an answer outright rather than delay it | typecheck, lint green · openapi + api + auth sweeps re-run 98/98 with the new route registered |
| 2026-08-20 | F7.4 | `POST /exams/:code/attempts`, and the rule it exists to hold: **the deadline is set once.** The resume path *reads and does not write* — an existing `in_progress` attempt is returned exactly as stored, with `remainingSeconds` recomputed from the column and the server's clock, and there is no code on that path that could extend anything, because the only thing that writes `serverDeadlineAt` is `ExamAttempt.start()` and it is not called. Migration **015** writes the attempt and its paper in one transaction: an attempt row without questions is unanswerable *and*, thanks to 004's one-live-attempt index, permanently blocks that exam — the worst outcome available from a dropped connection. `attempt_number` is derived **inside** the function under a row lock, because two tabs starting at once would each compute it from a count read a moment earlier and the second would die on the unique constraint. Rule 3 is made structural rather than procedural: `IExamQuestionForLearner` has **no field** for the answer key, and `findByAttemptForLearner` does not name `correct_answer` in its projection — a column that never enters the process cannot leak through a spread, a log line, or a mapper edited in a hurry. Coverage is derived from the **fraction of the track**, not `day / 7`: the sprint compresses four weeks into 21 days, so its day 11 is two weeks in and `ceil(11/7)` would ask about material the learner has not reached. **Caught a bug in my own draft**: the blueprint was seeded with a freshly generated id while a *different* id was stored as `seed`, which would have made the column a decoration — it cannot rebuild a paper it never selected. Three ports grew a method (`findUpToWeek`, `listAll`, `findByProfile`) and the two existing fakes were extended to match, not loosened | typecheck, lint green · openapi route sweep **caught the unregistered route** and passes after registering it (59/59 across the api sweeps) · the two touched suites re-run 8/8 |
| 2026-08-20 | F7.3 | Two properties that pull against each other on purpose: the paper is **reproducible from the `seed` column** — same seed, same pool, same questions, on any machine, so support can rebuild exactly what a learner sat — and it **prefers what they are weak at**, because an exam drawn uniformly from 1,240 words measures luck. The reconciliation is a jittered sort, not a shuffle: a candidate's position is its weakness plus a keyed pseudo-random third. Zero jitter gives a learner the same paper forever, which is a paper they can memorise; a full unit drowns the weakness signal and selects at random. The generator is **keyed, not sequential** — `seededUnitValue(seed, key)` is a pure function of its two arguments, so a candidate's number does not depend on where it sat in the list and adding a word to the course does not reshuffle every attempt ever taken. That is also why `Math.random()` is banned in the domain: a global generator's state depends on how many other things called it first. Section→type is data, because grammar-and-construction draws on three question types and a `switch` would hide the exam's shape inside a function. Zero I/O — weakness arrives already computed, so the caller reads repositories and this decides | typecheck, lint green — tests paused |
| 2026-08-20 | F7.2 | A section is a percentage **of itself** first and weighted second, and the alternative sounds equivalent but is not: pooling every question's points and weighting each question makes a section's influence depend on how many questions it happens to hold, so a 60-question paper with 8 pronunciation items would quietly score pronunciation at 13% instead of the 20% the spec fixes. Zero I/O is the point rather than a style preference — this is the calculation a learner's whole programme turns on, and it has to run against a table of numbers with no database, no clock and no network. It scores what it is given and **marks nothing**: deciding whether an answer was right takes different inputs per question type (a string comparison for dictation, the speech scorer for pronunciation), and mixing them in would make the weighting untestable without a scorer in scope. A section the blueprint produced no questions for is **dropped and its weight redistributed**, not scored zero — zeroing charges the learner for a generation bug, and leaving it in the denominator does the same thing more quietly. `passed` is `>=`, so a learner exactly on the pass mark passes; no reading of "70% to pass" supports failing somebody who scored precisely what was asked. `Object.fromEntries` would have needed an `as` to narrow its record, so the section map is built by assignment instead | typecheck, lint green — tests paused |
| 2026-08-20 | F7.1 | Four entities, four unions, two errors. `ExamStatus` has **five** states and not four because `submitted` is genuinely distinct: the diagnostic is ungraded and ends there permanently, and a graded attempt is handed in before it is marked — collapse them and an attempt that has been submitted but not yet scored has no status to be in. The transition graph is **data**, not a chain of `if`s, so "can an attempt be reopened" is a lookup with one answer: `submitted`, `passed` and `failed` allow nothing back. Rule 1 — the deadline is set once — is expressed as **the absence of a method**: `start()` writes `serverDeadlineAt`, refuses to run twice, and nothing else in `ExamAttempt` touches it. A check can be called with the wrong argument; a method that does not exist cannot be called at all. Same trick for rule 4: no method lowers `currentSectionIndex`. `submit()` is deliberately **not** deadline-guarded — an attempt that ran out of time is submitted, not rejected, which is exactly what the cron backstop does to abandoned ones and what a learner clicking submit on the final second deserves. `ExamQuestion.forLearner()` builds a new object field by field rather than spreading and deleting, because a spread copies whatever field somebody adds next and the thing that must not leak has to be **absent by construction**. `ExamDefinition` checks its section weights total 100 in the constructor — a per-definition invariant across four rows that a row-level check in 004 cannot see, and a definition totalling 95 would score every attempt 5% low, silently, forever | typecheck, lint green — tests paused |
| 2026-08-20 | F6.8 | `mode: 'pronunciation'` joins the same endpoint as the other two answer kinds, and **the phoneme axis of the mastery matrix finally has a source of data.** Dictation credits rule families only and is right to — spelling `very` correctly proves nothing about saying it — so until this use case existed half of `MasteryMatrix` had nothing behind it at all. Partial credit counts as a **miss** in the matrix: the learner produced a nameable wrong sound, and a cell that scored it correct would hide the exact gap the product exists to find. `perPhoneme` lines up with the resolved sequence position for position, which is how a score with no ids in it writes rows that need them. `isCorrect` needs no threshold of its own: above the near-miss ceiling there is no named error left, which is what the ceiling *means*. Error tags are only ever the ones 003's allowlist already knows — /v/↔/w/ has `V_W_SUBSTITUTION` and the other twelve confusions get **nothing**, because inventing `TH_SUBSTITUTION` here would fail `attempts_error_tags_known` at insert time, a runtime failure for something the build could have caught. The privacy constraint is enforced where it is either true or merely intended — **the request schema**: a `transcript` string, no audio field, and none permitted; the score is still computed server-side, because a client-computed score is a client-editable one. `heardPhonemes` is optional and exactly as untrusted as the transcript — an observation, not an identity and not a score — and it is the only route by which a stress error is ever visible | typecheck, lint green · openapi document sweep re-run 5/5 after the schema grew a third variant — the rest of the suite still not run, per the pause |
| 2026-08-20 | F6.7 | 42 cases, and **this one was written as a real suite** — test-writing is paused for the run, and F6.7 *is* a table of cases, so there was nothing else to build and shipping it unrun would have been shipping it unbuilt. Run through the **port**, not through the services behind it: every claim `07` makes is about what a learner is told — 65 not 0, a named fix, no fix invented for an error they did not make — and those are properties of the answer, so a suite written against `PhonemeComparer` would still pass with the blend wired backwards. Six correct · nineteen near misses covering all thirteen confusions, two apiece where one word could get it right by accident · five unrelated words · three silences · four homophones · five transcripts with extra words. The inventory is the 44 symbols **copied out of `010_seed_reference.sql`** rather than invented in the file, because a suite segmenting against a different inventory from the database tests a scorer nobody ships. A coverage assertion holds the table against the map, so a fourteenth confusion added later fails the suite until somebody writes it a case | `pnpm exec vitest run` on this file: **75/75**, 42 cases · typecheck, lint green — the rest of the suite still not run, per the pause |
| 2026-08-20 | F6.6 | `ConfusionMapSpeechScorer` implements the port, and it is an **adapter, not a domain service** — every judgement is made by the pure services in `speech/domain/` and this file only translates their vocabulary into the application's, so a real acoustic model replaces this one class and no use case changes, because none of them ever knew how a score was arrived at. One diagnosis per distinct **error**, not per damaged sound: a learner who says `wery` made one mistake, and a word with two /v/ sounds would otherwise be told the same thing twice, which reads as two problems. Stress needs its own pass — it damages no single sound, so every cell of `perPhoneme` can be full marks while the word is still wrong, and the diagnosis names the sound the emphasis landed on instead of the one it should have. Silence gets a real diagnosis rather than a crash or a zero with no explanation, and its wording is deliberate: nothing was recorded is a microphone problem, and telling a learner their pronunciation was wrong when the device never heard them is untrue as well as discouraging. **The port changed shape.** `expectedIpa: string` is gone in favour of `expected: ISpokenForm` — segmented sounds plus the stressed index — because cutting IPA needs the 44-phoneme inventory and the port is deliberately synchronous; the caller has already read the stored G2P to write mastery, so it hands over what it holds instead of making the scorer load the inventory again. `heard: ISpokenForm \| null` is new and is the only way stress is ever diagnosed — a transcript cannot carry it, and it is never guessed from text | typecheck, lint green — tests paused |
| 2026-08-20 | F6.5 | The blend, the band, and homophones. 50/50 is not arbitrary and each half fails in a known way alone: all-orthographic and `wery` scores the same as `wall`; all-phoneme and an unrelated word scores well whenever no confusion happens to fire. The **ceiling** matters as much as the floor — 65–90 is one sentence, and an attempt with a named error is not a 95, because a learner told it was has no reason to fix anything. Homophones are handled where `07` says explicitly and not accidentally: the recogniser writes a *word*, so a learner who pronounced `there` perfectly may get `their` back, and the orthographic half measures against the closest **acceptable spelling** so the recogniser's guess costs nothing while a real vowel error still costs what it should. Judgement call, stated: with no confusion found and no observed pronunciation, the phoneme half has **no evidence of its own** and takes the orthographic similarity rather than the deduced sequence's — the deduced sequence *equals* the expected one there, and scoring it would hand a wholly wrong word full marks on half the mark. **Probing the numbers found two real bugs.** The cluster-drop detector read spelling, so `asked` → `ask` — the commonest instance of that confusion — was undetectable: `asked` ends in the letters `e`,`d` and the sounds /k/,/t/, and only the second pair is a cluster. And any wrong answer the map nudged *slightly* closer collected a confident false diagnosis: `very` heard as `wall` was told to move the learner's lip. A residual tolerance that grows with the word (one edit in four letters is a recogniser approximating; three is a different word) killed it | typecheck, lint green · probed end-to-end: all 13 pairs land 65–90 (floor exercised at `cat`→`ket` = 65, ceiling at `station`→`istation` = 90), empty → 0 *not heard*, `their` for `there` → 100, extra words → 100, `elephant` for `very` → 13 with no diagnosis |
| 2026-08-20 | F6.4 | Four services, and the shape of them is dictated by the privacy rule: the server holds **text, never audio**, so it cannot *hear* /w/ where /v/ belonged — it can only notice that `very` came back as `wery`, that the map predicts exactly that deformation, and that nothing else predicts it better. `ConfusionDetector` is therefore a hypothesis test over the table, and it says so in its result (`isHypothesis`) so a deduced sequence is never read as evidence the untouched sounds were right. Only the **best** explanations survive: `this` heard as `dis` is improved by the /ð/→/d/ row and slightly by /θ/→/t/, and reporting both hands the learner a fix for a sound they never said. `align` is Needleman–Wunsch with the **substitution cost supplied by the confusion map** — plain edit distance calls every swap one error, which is precisely the claim `07` denies, and a cheap cost is what makes the learner's /w/ land against the /v/ it was meant to be instead of one deletion plus one insertion. `focusTranscript` picks the closest token, because the Web Speech API hears the room and `so anyway water right` must not tank a correct attempt. Stress is applied to the **whole word**, not to a slot: English lexical stress is what separates a REcord from reCORD, so every sound being right does not make the word right — and the per-phoneme array stays honest, since stress is not a phoneme and belongs in none of its cells | typecheck, lint green — tests paused |
| 2026-08-20 | F6.3 | Edit distance over **tokens**, not characters, and that is the whole design decision: the same arithmetic serves both halves of `07`'s blend — letters on the orthographic side, IPA symbols on the phoneme side — and `dʒ` is one sound written with two code points, so a per-character split would score it as two wrong sounds instead of one. Two rows rather than a full matrix, not for memory (the words are five letters long) but because a matrix invites a caller to read the traceback out of it, and alignment is a different question with its own service. Normalisation divides by the **longer** side: `s` against `station` is six edits over seven, 0.14; dividing by the shorter side would return a negative similarity for an answer that was merely short. **Two empty sequences score 0, not 1** — they are identical and identity is not the question, and `07` requires an empty transcript to come back 0 with a *not heard* diagnosis rather than full marks for silence. `textSimilarity` segments by grapheme cluster through `Intl.Segmenter` rather than spreading the string; lint caught the spread, and it was right to — a code-unit split breaks a Bangla conjunct into pieces and reports two errors where a reader sees one character | typecheck, lint green · arithmetic spot-checked against the textbook kitten/sitting = 3 — tests paused |
| 2026-08-20 | F6.2 | Thirteen confusions as an array, never a branch — `07-speech-scoring.md` asks for that and the reason is not tidiness: this table is **content**, it grows when a teacher notices a pattern, and a branch per pattern would mean rewriting the scorer every time somebody learns something about learners. Every row is a documented fact of Bengali against English rather than a guess: Bangla has no /v/, /z/, /θ/ or /ð/, its sibilants pull /s/ toward /ʃ/, it has no /æ/, it does not permit word-initial /s/+stop so a vowel appears in front, and it has fixed initial prominence where English has lexical stress. Coverage is the gate's list in full — v↔w, θ→t, ð→d, z→dʒ, ʃ↔s, æ→e, epenthesis before /sk/ /sp/ /st/ as three separate rows, dropped final cluster, first-syllable stress. Two fields the doc's sketch did not have, both forced by the privacy constraint: `kind`, because the browser sends **text** and a substitution shows up as a spelling shift while epenthesis, cluster-drop and stress are structural and need a detector each rather than a letter swap; and `graphemeShifts`, the orthographic shadow of the phoneme swap — `very` arriving as `wery` is the only trace of /v/→/w/ a transcript can carry. `explain()` returns **null** for an unrelated word, which is the field that keeps diagnoses honest: naming a fix for an error the learner did not make is worse than naming none | typecheck, lint green — tests paused |
| 2026-08-20 | F6.1 | The stored G2P, read at last. `words.ipa` is the G2P — `07-speech-scoring.md` bans deriving it at runtime, because English grapheme-to-phoneme is a research project and a curated lookup over a closed vocabulary is both correct and fast — and `IpaSegmenter` cuts that stored transcription into the 44 symbols of 002 by longest match, so `uː` never comes back as `u` plus a stray length mark and `dʒ` never as `d` then `ʒ`. `word_phonemes` has carried a comment since 002 saying it drives per-phoneme mastery and **nothing had ever read it**; `IWordPhonemeRepository` does, batched by word id for the same N+1 reason `findByIds` exists. The two sources are not redundant and `WordPhonemeResolver` says which wins where: the transcription owns the **shape and the stress** (the scorer compares those), the join table owns the **ids** (mastery writes against those), and where the join table is silent — content seeded before Phase 9 links it up — the symbol still resolves through the inventory. That fallback is why *every* seeded word resolves to a sequence rather than most of them. A slot whose symbol is not one of the 44 keeps a null `phonemeId`: scored, never credited, because a mastery row under an invented id is worse than an absent one | typecheck, lint green — tests paused |
| 2026-08-19 | F5.9a | `GET /api/v1/openapi.json`, generated from **the same Zod schemas the handlers validate with** — every one imported from the module that parses with it, none redeclared, because a hand-maintained document drifts the first time someone is in a hurry and a drifted spec is worse than none since people believe it. Public, deliberately: it describes shapes rather than data, and documentation needing a session is a puzzle. A sweep holds the document against the filesystem, so a route added under `src/app/api/v1/` and left unregistered fails the suite. **Writing this exposed a real hole in F3.7's guarantee**: the public-routes sweep only ever read `route.ts`, and every handler now lives behind a three-line re-export — a module handler could have gone public without ever appearing on the written list. The sweep now follows the re-export two hops, and I mutation-probed it by making `/review/due` public in its handler and watching it fail. The generator had to sit in `presentation` rather than `src/lib`, because `lib` may not import `presentation` — the boundary pointing at where the code belonged. Closes **F1.11**, deferred out of Phase 1 for want of a v1 schema | typecheck, lint green · 5/5 on the document sweep · public-routes sweep strengthened and mutation-probed · full suite 394/394 |
| 2026-08-19 | F5.8 | `src/composition/reads.ts` is the composition root's front door for a page, and it calls **the same factories `handlers.ts` calls** — not two implementations that agree today, one implementation with two callers, so there is nothing for a page and its endpoint to drift apart *from*. `/dashboard` is a real Server Component reading through it, plus `GET /api/v1/progress/summary` and `/progress/mastery`. Four sweeps hold the rule over the whole `src/app` tree: no page fetches this app's own API, no page constructs a use case, no page imports a repository or a domain type, and both composition files pull from one factory module. The first sweep's only hit was **this page's own doc comment** promising it would never happen — reworded rather than excepted, the same call F3.11 and F4.5 made, because an exception list is how a real hit gets waved through. The dashboard markup is deliberately plain: Phase 10 builds the shell and the components, and this exists so the read path is provable now rather than asserted now and built later | typecheck, lint green · full suite 389/389 · the four one-implementation sweeps green |
| 2026-08-19 | F5.7 | Seven routes across program, lessons and review, every `route.ts` a three-line re-export and every one declaring `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`. `withApi` grew a **`paramsSchema`**: a path segment is as untrusted as a body — `:dayIndex` arrives as `"99"` or `"../../etc"` as readily as `"3"` — and a handler doing `Number(params.dayIndex)` itself would pass `NaN` to a use case, where `DayIndex.of` throws and becomes a **500 for what is really a 422**. No handler contains a business rule. The nearest thing is the `switch (body.mode)` in the attempt handler, and it is routing: Zod's discriminated union has already narrowed the body, neither branch decides anything about the answer, and one endpoint rather than two is what stops the session lookup, the ownership check and the day-membership check being written twice. Error mapping is shared in one `toApiError` so the three lesson handlers cannot disagree about what a stage violation is — and the statuses are deliberately distinct: a locked day is 403 (the learner exists and may not have it yet), a missing day is 404, an illegal stage is **409 not 422**, because the body was fine and telling a client otherwise sends them looking in the wrong place. No request schema anywhere declares an identity field | typecheck, lint green · full suite 385/385, including the protected-by-omission sweep over all seven new routes |
| 2026-08-19 | F5.6 | The dashboard's query count is now **asserted against an exact list of five**, not a ratio — a test saying "fewer than ten" passes the day someone adds a loop. The fake makes the wrong shapes impossible rather than merely uncounted: `findDue`, `listDays` and `findCompletedDayIndexes` all **reject**, so a dashboard that fetched due items to call `.length`, or loaded 28 days to render one tile, fails rather than quietly costing more. That is the failure mode worth catching, because an N+1 here reads correctly, types correctly, returns the right answer, and only gets slower in proportion to how much the learner has done — which is backwards, since the learners with the most history are the ones still using the product. The batching that makes five possible is already in the ports: `countDue` is a `count`, `findByIds` takes a list, and `findCompletedDayIndexes` returns numbers rather than sessions | typecheck, lint green · 4/4 — exactly five queries, and the N+1 shapes rejected outright |
| 2026-08-19 | F5.5 | `RetryingDatabase` decorates the seam: 23505 → `ConflictError`, 23503 → `MissingReferenceError`, everything else stays a `DatabaseError` and becomes a 500 — the honest answer for a failure nobody has decided about. A decorator rather than logic inside the adapter, because the adapter's job is to speak Supabase and "what does 23505 mean" is a policy decision. **Exactly one retry on 40001**, proven by counting calls: the winner has already committed — that is what made this transaction fail — so there is nothing to wait for and no backoff, and a second retry would turn a contended row into a queue of clients all retrying at once. A conflict is never retried, since nothing about it will change. The two new errors are deliberately distinct: a conflict means something exists that should not, a missing reference means something does not exist that should, and the second sends an operator to the content seed rather than to the learner | typecheck, lint green · 7/7 — each code mapped, the retry counted at exactly two calls |
| 2026-08-19 | F5.4 | **`IUnitOfWork` could not be built, so it is gone.** A callback unit of work assumes the caller can open a transaction and run statements inside it; Supabase speaks PostgREST, where every call is its own HTTP request and therefore its own transaction. `run(work)` would have compiled, run, and provided no atomicity whatsoever — a lie in a type, which is worse than the missing feature. It is replaced by `ILessonWriteUnit`, whose two methods are each **one Postgres function call**. Migration **013** `record_lesson_attempt` covers the per-answer path 009 never had: one answer writes an attempt, moves the session counters, upserts the ladder and upserts mastery, and a failure after the second leaves a learner whose review advanced and whose mastery did not. Migration **014** `complete_lesson_day` fixes a hole F4.12 opened — 009's function does not touch `learner_profiles`, so a crash between closing the session and advancing the learner sends somebody who finished day 5 back through day 5. A **new** function rather than a replacement, because `create or replace` with a different argument list makes an overload, and migrations are forward-only. Session counters are now incremented **inside** 013 rather than written from a number computed in TypeScript — two answers submitted at once would each write "the total as I saw it" and one would be lost. `SubmitReviewAttempt` needed no transaction at all and lost its unit of work: it writes one row | typecheck, lint green · 6/6 against real Postgres — the mid-write rollback proven, both functions unreachable by `authenticated` · migrations 94/94 |
| 2026-08-19 | F5.3 | Ten repository implementations behind the shared seam, all eleven ports now wired in `src/composition/container.ts` — one `IDatabase` handle per request, shared by every repository. **Writing this found a real bug that nothing else would have caught until the first learner submitted an answer**: the review upsert targeted `(profile_id, item_id)` while 003 declares `unique (profile_id, item_type, item_id)`, and Postgres refuses a conflict target that does not match an index exactly. It is now a sweep — every `onConflict` string in `src/modules/` is held against the unique indexes the migrations actually declare, mutation-probed by reintroducing the bug and watching it fail. The adapters keep the product rules where they belong: `findDue` filters but does **not** order or cap, because the 25 and the most-overdue-first ordering are `06`'s decisions and in SQL they would be invisible to the use case and untestable with a fake. `ignoreDuplicates` differs per table and each choice is stated — a review conflict **should** update, a profile bootstrap conflict must **not**, because there it means another request won the race. **The gate's integration tests against a real local Supabase were not written — verification is paused** — so these adapters are typechecked and unexercised against Postgres | typecheck, lint green · onConflict sweep 1/1, mutation-probed — the integration tests the gate asks for were NOT written |
| 2026-08-19 | F5.2 | Ten mappers, both directions, and the round trip **proven** entity → row → entity for every one — `toStrictEqual` on the whole object, so a mapper that drops `common_misspellings` on the way out fails here rather than making wrong answers silently untaggable months later. Every closed set is a Zod `enum` at the boundary, so a tenth `part_of_speech` added to 002's constraint drops the row visibly instead of arriving in the domain as a string nothing can render. `parseRows` **drops** a malformed row and `parseRow` returns null, and the split is deliberate: a bad row in a list is one missing word and failing the request turns a content error into an outage, while a bad row in a single read is the thing the caller actually asked for. `mastery_records.accuracy` is **written and never read** — the entity derives it, because two stored numbers that can disagree produce a matrix showing 4/5 beside 60%. Program-day items are sorted in the mapper rather than trusted from the query: the entity's contract promises ascending order, and an adapter that forgot its `order by` would play a lesson's stages in whatever order Postgres chose. The second half of the criterion — no row interface escaping `infrastructure/` — is already the Phase 2 sweep, re-run green | typecheck, lint green · 10/10 round trips · rows sweep 8/8 — row interfaces still confined to infrastructure |
| 2026-08-19 | F5.1 | One seam for every repository: `IDatabase`, a **description** of a single-table query rather than a fluent chain — no joins, no mapping, no identity map, which is the opposite of the ORM CLAUDE.md bans. It exists because Supabase's builder is generic enough that checking a test double against it makes the compiler give up (TS2589, the reason Phase 3 hand-rolled its own narrow slice), and because "only `src/lib/supabase/` constructs a client" is only enforceable if a repository cannot name the client type at all. The sweep proves both halves and found one real hit — Phase 3's `to-profile-database.ts` — so the auth repository was **migrated onto the shared seam and its bespoke one deleted**, rather than the sweep growing an exception. That migration would have silently dropped two behaviours, so both were carried across deliberately: `ignoreDuplicates` (without it an upsert becomes an update and the loser of a race stamps over the winner's display name) and the 23505 tolerance, which needed `DatabaseError` carrying its Postgres code — F5.5's mapping, arriving early because this needed it. The adapter had to move from `src/lib` into `shared/infrastructure`: `lib` may not import `infrastructure`, and the dependency genuinely runs the other way | typecheck, lint green · the one-client sweep 2/2 · auth suite 39/39 with all 11 repository assertions preserved |
| 2026-08-19 | F4.15 | `GetMasterySnapshot`, `GetProgressSummary`, `GetLearnerDashboard` — **closes Phase 4**. The dashboard is five queries and always five: one for the profile, then four in parallel, none of which loops or grows with how much the learner has done — the due count is a `count`, not a fetch-and-length, and the open session is found by day rather than by scanning a history. That is the shape the Phase 5 gate's N+1 assertion is written against. Three places where the obvious number would have been a lie: `streakIsAlive` is not `currentStreak > 0` (a learner last active three days ago still has a stored streak, and showing it is a number about to reset without warning); `overallAccuracy` for a learner with no attempts is unmeasured rather than 0%, because "0% accuracy" before a first answer reads as failure; and the dashboard returns `today: null` instead of throwing when a day has no content, so an incomplete seed costs the learner their lesson tile and not their whole screen. `overallAccuracy` is folded from mastery records rather than counted over `attempts` — both agree today, one still answers in a year with fifty thousand attempt rows behind it | typecheck, lint green — tests paused |
| 2026-08-19 | F4.14 | `GetDueReviewItems` and `SubmitReviewAttempt`. The criterion is proven, not asserted: 40 due → 25 returned, most overdue first, ties by lowest accuracy, and overdue measured at the **learner-local day boundary** (an item due 23:00 UTC on the 17th is one day overdue at noon Dhaka on the 19th, not two). The cap lives in the use case rather than a SQL `limit` because it is a product decision — the queue is shortened for the learner's sake and nothing about the schedule changes — and `totalDue` goes out beside it so a learner returning after a fortnight is not left wondering why the queue never empties. The tiebreak is what makes the cap fair: 25 items all one day overdue is the common case, and taking them in whatever order Postgres returned would keep showing the learner the words they already know. `SubmitReviewAttempt` deliberately writes **no `Attempt` row** — `attempts.session_id` is not nullable in 003 and a review happens outside a session, so inventing one to hang it off would corrupt every per-session number the product reports; the review item's own counters are the record. It also resolves the item from the **due list**, so answering something not actually due is refused by the same lookup that finds it | typecheck, lint green · 4/4 on the kept queue probe — 40→25, ordering and tiebreak proven |
| 2026-08-19 | F4.13 | `SubmitDictationAttempt` and `SubmitConstructionAttempt`. The mandatory case is enforced **before anything is written**: the item id arrives in the request body, so any client can send any id, and without the day-membership check a learner could grind one easy word to mastery or answer day 27's vocabulary on day 2 and skew every number they have. One answer moves four things — the attempt row, the session counters, the review queue and the mastery record — and all four happen **now, in one `IUnitOfWork`**, not batched to the end of the lesson: a learner who abandons at `speak` must keep the work they actually did. Dictation credits the **rule family only, never the phonemes** — spelling "very" correctly demonstrates nothing about saying it, and crediting the sounds here would make the pronunciation half of the mastery matrix a lie. Construction fans out instead: one sentence can demonstrate an article, a preposition and a tense at once, which is why `MasteryCalculator.apply` takes a list. `correctValue` is returned **only on a wrong answer** — always returning it is how an answer key ends up in a network response | typecheck, lint green — tests paused |
| 2026-08-19 | F4.12 | `StartLessonSession` is **not an insert** — it resumes. A learner who reached `dictate` and closed the tab comes back to `dictate`; a second session for the same day would restart them at `review` and count every attempt they are about to make against a fresh `itemsTotal` while the first sits half-finished forever. Idempotent for the same reason `BootstrapProfile` is: a page load and its own prefetch are two requests. `AdvanceLessonStage` takes the **target stage rather than "next"**, which looks weaker and is stronger — a stale tab or a double-tap sends `dictate` when the session is at `speak`, and "next" would quietly skip the learner to `build` where a named target is refused. `CompleteLessonSession` closes the session, advances the position **only when the finished day is the current one** (revisiting day 3 does not earn day 5), and registers the streak, all inside one `IUnitOfWork`. Two regressions caught and fixed in this lap: the profile port needed `save`, which broke three fakes and the Supabase adapter; and F4.10a's static import of the rate limiter had made **every route module require Supabase env at load time**, `/api/health` included — now imported lazily, only when a route actually declares a limit | typecheck, lint green · full suite re-run after the churn: 351/351 (was 327 at Phase 3 close) |
| 2026-08-19 | F4.11 | `GetProgramOverview` and `GetProgramDay`. Both take a `userId` from the verified session and resolve the profile themselves — no input carries a `profileId`, so there is no field for a body to forge. The overview answers three questions in one shape (the track's days, the learner's position, which days are done) because a component asking three times is three round trips and three chances for them to disagree about what "current" means; `findCompletedDayIndexes` returns **numbers, not sessions**, since loading 28 sessions to tick 28 tiles is the N+1 the Phase 5 gate is written against. `GetProgramDay` checks the lock **before** reading any content — a learner probing urls should cost one query and a refusal, not a fully assembled day the server then withholds — and separates `DayLockedError` from `DayNotFoundError`, because "not yet" sends an operator to the learner's position and "no such day" sends them to Phase 9's seed. The day DTO deliberately omits `acceptedAlternatives` and `commonMisspellings`: both are answer keys, and shipping them to a browser is the same class of mistake as `correct_answer` in an exam response | typecheck, lint green — tests paused |
| 2026-08-19 | F4.10a | The carried F1.9, closed: migration **012** ships `rate_limits` and `consume_rate_limit`, and `withApi` finally has the rate limiting CLAUDE.md always said it owned. The counter increments **inside** the database in one `insert … on conflict do update`, because a read-then-write limiter has a gap that more connections win. Fixed window, not sliding — the known cost is twice the limit across a boundary, which for write routes is not an incident, and it is written down rather than discovered later. `IRateLimiter` is declared in `src/contracts`, a **deliberate departure** from `05-domain-model`'s ports list: its only caller is `withApi` in `src/lib`, and `lib` may import `contracts` but not `application` — better than loosening the boundary or writing the interface twice. Limiting runs **after** the session check, so an anonymous flood on a protected route is answered 401 without touching the table, and the subject is a learner id wherever there is one rather than an address standing in for an office. It **fails open and logs loudly**: this is abuse protection, not authorisation, and a hiccup in the counter table must not lock every learner out. Conforming to 03's table conventions broke four existing structural tests — fixed by conforming the table (uuid id, created_at, updated_at, a row interface, an owning module), never by excepting it | typecheck, lint green · 6/6 against real Postgres in PGlite: 61st refused, window resets, two learners separate, and the function unreachable by `authenticated` · the 147 db-convention tests green again |
| 2026-08-19 | F4.10 | `IClock`, `IIdGenerator`, `IUnitOfWork` and `ISpeechScorer` in `shared/application/ports/`. The grep was run and is **not** vacuously clean, so here is the honest reading: `domain` 0 hits, `application` 0 hits, and three remaining in `src/lib/api/with-api.ts` — two measuring request latency and one stamping the response envelope. Those are `lib`, not a use case, and request duration is not domain time; the rule CLAUDE.md states is that a **use case** never calls `Date.now()`, and that holds absolutely. `IIdGenerator` exists because a lesson session and its first attempt are written together and the attempt needs the session's id while both are still in memory — letting Postgres fill the uuid means a use case cannot build an object graph before saving any of it. `IUnitOfWork` takes a callback rather than `begin`/`commit` so there is no way to forget the commit or leave a transaction open by returning early. `ISpeechScorer` is transcript-in, never audio — `07`'s hard privacy constraint — and is deliberately **synchronous**, because Phase 6 scores by lookup and writing every use case `await`-shaped for an acoustic model nobody has is the wrong kind of foresight | typecheck, lint green · clock grep run: domain 0, application 0, 3 in lib/api reported not hidden |
| 2026-08-19 | F4.9 | Eleven repository ports, eleven Symbol tokens, checked 1:1 by a sweep over `*/domain/repositories/` — and the other half of the criterion holds too: no `application` file names `infrastructure`, no `domain` file imports anything but `domain`, and every use-case constructor parameter is an `I`-prefixed interface. **Eleven, not the spec's eight**: `05-domain-model` lists one library repository, but `Phoneme`, `RuleFamily` and `SentenceItem` are separate tables read by different screens, and one port spanning four aggregates is a port nobody can implement narrowly. The interesting decisions are in what the ports refuse to offer — `IAttemptRepository` has `append` and no `save`, because 003 gives the client no update and a port offering one is a way around a rule the database is enforcing; `IReviewItemRepository.findDue` takes **no limit**, because the cap of 25 and the most-overdue-first ordering are product rules from `06` and pushing them into SQL would hide them in an adapter where no fake can test them. The `Attempt` entity lands here too — the port cannot be typed without it — and deliberately has no method returning a changed copy | typecheck, lint green · port/token sweep 11/11 · layer-import sweep clean |
| 2026-08-19 | F4.8 | `ErrorTagger` — the service that makes this diagnostic instead of a quiz. Nine tags, each with its own detection: `v`/`w` at the same position, a doubled consonant collapsed, a written-but-unsounded cluster dropped (`knife`→`nife`), `y` left where `i` belongs, a `-tion` spelled as it sounds; and for sentences, a missing article, a preposition swapped for another preposition, a shared stem carrying the wrong tense marker, and word order — **checked first and short-circuiting**, because the right words in the wrong order make every other rule fire too and hand the learner four tags for one mistake. It prefers silence to a guess: an unrecognised wrong answer returns no tags, since an untagged error is a visible content gap and a mis-tagged one teaches the wrong lesson. Two bugs caught while proving it: the Y_TO_I reconstruction produced `studyes` rather than `studys`, and a bare `h` silent-letter entry would have tagged `the`→`te`, which is not a silent h — dropped rather than kept as a near-miss. `MasteryCalculator` folds one attempt's several observations into per-phoneme and per-rule-family records and returns **only what changed**, so `last_updated_at` still answers "when did I last practise this". `accuracy` is derived, never stored twice — a matrix showing 4/5 beside 60% is a matrix nobody trusts again | typecheck, lint green · 13/13 on the kept tag-coverage probe — all nine tags produced by a real wrong answer |
| 2026-08-19 | F4.7 | `StreakRecord.registerActivity()` compares learner-local calendar days, never instants — a UTC+6 learner finishing at 23:50 has finished on that day, and a server comparing UTC dates would break their streak at ten to midnight every single night. Four documented cases: first activity starts at 1, same day changes nothing (a lesson then a review is not two days), the next day grows it, a gap of one missed day spends a freeze if there is one and otherwise restarts. The **fifth case had no rule in the spec and needed one**: the local day can move *backwards*. A learner active in Dhaka on the 19th who opens the app in New York is on the 18th, and every comparison here reads that as a gap of minus one. Treated as "same day" — nothing changes and `lastActiveDate` is never walked backwards — because the alternative is resetting the streak of somebody who got on a plane | typecheck, lint green — tests paused |
| 2026-08-19 | F4.6 | Mastery granted, through the policy rather than decided in the entity — `isMastered` now follows from the same day-counting counter F4.4 built, so the rule and the counter cannot drift apart. **Granted once, never revoked:** a mastered item later missed drops to rung 0 and comes back tomorrow like anything else, and that is correction enough; taking the badge back as well tells a learner they have un-learned something, which is untrue and is how people stop. Both policy arguments are `consecutiveCorrect` because by construction it *is* the distinct-day count — the interface still takes the pair separately so a future caller counting answers cannot buy mastery in one sitting. Verified with a throwaway probe that covered all five of `06`'s mandatory cases and passed, including the exact due instant `2026-08-21T18:00:00Z` for a Dhaka learner; **kept** as `review-engine.test.ts` rather than discarded, since it was already written and the engine is the product | typecheck, lint green · 5/5 on the kept engine probe — test-writing otherwise paused |
| 2026-08-19 | F4.5 | `IntervalLadderPolicy` — the one file that knows `1, 3, 7, 16, 35`. The grep criterion was run and is clean: outside the policy the only hits for those numbers are a Tailwind `px-16`, a CSS gradient stop and `CRON_SECRET`'s `min(16)`. One real hit was a prose comment in `ReviewItem` naming the longest interval — reworded rather than excepted, the same call F3.11 made, because an exception list is how a real hit gets waved through later. `nextDueAt` resolves to the **start of a learner-local day**, not to an instant 24h × n after submission: an item answered at 21:00 and due "in one day" belongs in tomorrow morning's session, not at 21:00 tomorrow evening after the learner has stopped. That needed `zonedDayStart`, which reads the zone offset back out of `Intl` — two sampling passes, because a single guess can land on the wrong side of a DST transition | typecheck, lint green · the ladder-numbers grep run and clean — tests paused |
| 2026-08-19 | F4.4 | `ReviewItem.recordResult()` — correct climbs one rung, wrong drops to rung 0 from anywhere including the top. The entity never learns the ladder's numbers *or its length*: it asks `IReviewSchedulingPolicy` for the next rung and the next due date, which is what keeps `1,3,7,16,35` inside one file for F4.5's grep to prove. `consecutiveCorrect` counts **days, not answers** — a second correct answer on the same learner-local day leaves it untouched, so drilling one word five times in a session cannot buy mastery. That needed a real `LocalDate`: comparing a UTC instant to a learner's calendar day is the bug this whole engine is written around, and both `last_correct_on\' and `last_active_date` are `date` columns because the resolution happens once, on the way in. Two departures from `06`'s sketched interface, both deliberate — `nextIntervalIndex` (the cap at rung 4 is a fact about the ladder, which the entity may not know) and a `timezone` on `nextDueAt` (the doc's own signature cannot deliver the day-boundary rule its prose demands two lines above) | typecheck, lint green — tests paused |
| 2026-08-19 | F4.3 | `LearnerProfile` grows from six fields to twelve — the whole of 003 plus 011 — and stops being positional doing it: `track`, `timezone`, `uiLanguage` and `accentPreference` are all strings, and eleven positional arguments is a transposition the compiler could not have caught. `timezone` is the field Phase 4 actually needed; streaks and the three-different-days mastery rule both compute their day boundary in it. `currentDayIndex` is a `DayIndex` now, so the wire contract converts once at the handler instead of passing a bare number through four layers. `LessonSession.advanceStage()` reads position in `LESSON_STAGES` rather than a transition map that could drift from 003 — forwards by exactly one, because skipping `dictate` asks a learner to pronounce a word they never spelled, and going back re-counts items already counted. `complete()` only from `build` | typecheck, lint green · the 4 refactored auth test files re-run: 39/39 — tests otherwise paused |
| 2026-08-19 | F4.2 | The five content entities, each carrying the behaviour that would otherwise leak into a component. `Phoneme.isAbsentFromBangla()` names what a null `banglaEquivalent` means so the next reader cannot mistake meaningful data for a gap. `RuleFamily` guards 3 examples and 2 counterexamples in its constructor as well as in 002 — content assembled in memory by a seeder or a fixture cannot build a rule the database would reject, and a rule with no counterexample teaches a false absolute. `Word.matches()` and `SentenceItem.accepts()` put answer comparison in the domain over one shared `normaliseAnswer`: case and whitespace are forgiven, letters are not, because "there" and "their" differ by exactly what the programme exists to teach. `ProgramDay` holds items as one ordered list, the way `program_day_items` stores them and the way a lesson plays them — the three id arrays in the spec are derivations, offered as methods | typecheck, lint green — tests paused |
| 2026-08-19 | F4.1 | Five value objects in a new `shared` module, so the things every other module counts in have one definition. `DayIndex` guards 1..28 at the longest track's length, not the learner's — whether day 25 is past the end is a question about `sprint21`, and only an entity holding a track can answer it. `ScorePercent` rounds to two decimals at construction, matching the `numeric(5,2)` columns: a float from a scoring API that stores at a precision the column cannot hold reads back different. `IpaTranscription` enforces the "bare IPA" 002 only wrote in a comment — `/wɔː/` never equals `wɔː`, and pronunciation scoring compares transcriptions. `ErrorTag` is 003's nine-tag allowlist as a frozen union. `Track` **moved** from `auth` to `shared`: it is a programme-wide concept, and program, lessons and review all need it — one definition below them all rather than beside one of them | typecheck, lint green — tests paused |
| 2026-08-19 | F3.12 | The rule stated once and checked over the whole tree, so the next endpoint inherits it: no request schema declares an identity field, nothing reads one out of a url, nothing but `withApi` and `requireUser()` can produce an `IAuthenticatedUser`, and no handler spreads a body into a use-case input — `execute({ ...body, userId })` looks safe and is one careless reorder from letting the body win. Plus the behavioural half: a body or query carrying another learner's id reaches `ctx.body`, never `ctx.user`. **The structural sweeps are near-vacuous today** — no v1 request schema exists until Phase 5 — and they are there for the first one | `pnpm test` 327/327 — 9 new, all six mutations caught (two probes re-run after being mis-designed) · `pnpm test:e2e` 9/9 · typecheck, lint green |
| 2026-08-19 | F3.11 | The gate's grep is now a test, `src/lib/auth/one-door.test.ts`, and it sweeps test files too — a test that types a credential into a form is a form that accepts one. Its single hit was pino's fourth redaction path, guarding a value this app cannot hold; removed rather than excepted, because an exception list is how a real hit gets waved through (D26). The other three paths are real and stay. The reasoning had to move to `ARCHITECTURE.md` — a comment explaining the ban trips the ban | `pnpm test` 318/318 — 3 new, all four mutations caught (redaction restored, OTP mention, an email field on `/login`, and the sweep itself blinded) · `pnpm test:e2e` 9/9 · typecheck, lint green |
| 2026-08-19 | F3.10 | `GET /api/v1/me` — the module's first `presentation/` code, and the first three-line `route.ts`. `presentation` may not reach the composition root, so the handler is a factory taking the use case it needs and `src/composition/handlers.ts` is the one file that knows where that comes from. Position travels with its total: `track` decides 28 or 21, and the entity answers it rather than the client. `Track` is a checked union at the mapper, so a value added to 003's constraint cannot arrive in the domain unnoticed | `pnpm test` 315/315 — 15 new, all eight mutations caught · coverage 100% on domain and application · `pnpm test:e2e` 9/9 · typecheck, lint green |
| 2026-08-19 | F3.9 | The phase's first real module — `src/modules/auth/` across all four layers, wired in `src/composition/`. Idempotence lives in the port, not the caller: `insertIfAbsent` is `on conflict do nothing` and reads back, so Postgres decides the race and the loser reads what the winner wrote. The use case owns the display-name chain, reproducing 009's so the two cannot disagree. Called from `/auth/callback` — the first authenticated request by construction, and the only layer allowed to reach the composition root. Found and fixed a build-breaker: an empty `CRON_SECRET=` is present, not absent, so `.optional()` never applied | `pnpm test` 300/300 — 33 new, all eleven mutations caught · coverage 100% on domain and application (the 90% floor had never been runnable — `@vitest/coverage-v8` was missing) · `pnpm test:e2e` 8/8 · typecheck, lint green |
| 2026-08-19 | F3.8 | `withCron` — the guard every scheduled route is built by, a `withApi` route underneath so it keeps the request id and the problem+json. Both sides are sha256'd before `timingSafeEqual`, because that function throws on a length mismatch and throwing early leaks the length one guess at a time. Header only, never the query string. A missing `CRON_SECRET` refuses rather than waving through. `CRON_UNAUTHORISED` is its own code so an operator is not sent to fix a login. **No cron route exists yet** (Phase 8), so the gate item is proven at the wrapper | `pnpm test` 268/268 — 14 new, all seven mutations caught (the constant-time one needed a structural guard — no assertion on a result can see timing) · typecheck, lint green |
| 2026-08-19 | F3.7 | `auth?: 'required' \| 'public'` replaces the boolean, and the boolean stops compiling — two spellings of the opt-out is one too many. A word can also be counted, which is the real gain: a sweep over `src/app/api/**/route.ts` holds every public endpoint against a written list, so a new one fails the suite until someone adds it deliberately. Saying `'required'` out loud is banned too; its absence is the rule | `pnpm test` 254/254 — 8 new, all three mutations caught including a planted unlisted public route · `pnpm test:e2e` 8/8 · typecheck, lint green |
| 2026-08-19 | F3.6 | `withApi` stops calling `getUser()` inline and goes through the same `readUser()` a Server Component does — a handler and a page can no longer disagree about who is signed in. Its private two-field `IAuthenticatedUser` is gone in favour of the contract. Absent, expired and tampered cookies all arrive as null and leave as one 401 problem+json that names none of them; the session is checked **before** the body is parsed, so an anonymous caller cannot map a schema one 422 at a time | `pnpm test` 246/246 — 12 new, all five mutations caught · `pnpm test:e2e` 8/8 · typecheck, lint green |
| 2026-08-19 | F3.5 | `requireUser()` and `useSession()`, over one `IAuthenticatedUser` contract — the client is handed exactly what the server verified, so there is no second, looser shape. `useSession()` throws outside its boundary rather than reporting nobody: a missing provider and a signed-out learner must not look alike. A verified session with no profile is loud, never "signed out" — that redirect would loop through `/login` forever — and a sweep pins `auth.getUser(` to exactly three files | `pnpm test` 234/234 — 17 new, all seven mutations caught · `pnpm test:e2e` 8/8 · typecheck, lint green |
| 2026-08-19 | F3.4 | `src/middleware.ts` — `getUser()` refresh on every page, then protect-by-default: a page nobody listed is private, and an unauthenticated request for one is a redirect, never a 401. `/api/` is outside the matcher on purpose — a `fetch` answered with login markup is a 200 the caller cannot branch on, so that 401 stays `withApi`'s (F3.6). `secure` finally lands on the session cookie, off `NEXT_PUBLIC_APP_URL` rather than the spoofable `x-forwarded-proto`. One session client, two cookie transports, so neither can skip the hardening | `pnpm test` 217/217 — 15 new, all eight mutations caught · `pnpm test:e2e` 8/8 · typecheck, lint green |
| 2026-08-19 | F3.3 | `/auth/callback` — server-side PKCE exchange, then routing on `learner_profiles.onboarding_completed_at`, a column 003 never had (migration 011). The row's *existence* cannot mean "has been here before": 009's signup trigger creates it before the learner sees a screen. Every failure — refusal, missing code, stale code, unreadable profile — lands on `/login?error=google`, and a refusal carrying a code is still never exchanged | `pnpm test` 202/202 — 10 new, all six mutations caught (one survived first: the refusal guard was untested against a code) · `pnpm test:e2e` 5/5 · typecheck, lint green |
| 2026-08-19 | F3.2 | `/login` — one heading, one line, one Google button, and `POST /auth/signin` building the OAuth url server-side. A plain HTML form, not a Server Action: an action form renders a hidden `$ACTION_ID` input, and this page must carry zero inputs — it also means sign-in survives with JavaScript off | `pnpm test` 192/192 — 10 new, all six mutations caught · `pnpm test:e2e` 3/3 · typecheck, lint green |
| 2026-08-19 | F3.1 | `@supabase/ssr` cookie session client — `toSessionCookieOptions` overrides the library's own `httpOnly: false` default so the access and refresh tokens are unreadable by script; every cookie in a chunked batch is hardened, the rest of Supabase's attributes pass through | `pnpm test` 182/182 — 9 new, all four mutations caught · `pnpm test:e2e` 1/1 · typecheck, lint green |
| 2026-08-19 | F2.10 | 22 hand-written row interfaces across the nine owning modules, plus `Json` for jsonb; verified column-for-column against the Postgres catalogue instead of the uninstalled Supabase CLI. **Closes Phase 2** | `pnpm test` 173/173 — 8 new, each mutation-probed · typecheck, lint green |
| 2026-08-19 | F2.9 | `010_seed_reference` — the 44 English phonemes annotated for a Bengali speaker and the 24 rule families, seeded idempotently on their natural keys; the migration names every symbol and code so a lost or mistyped row fails the deploy | `pnpm test` 165/165 — 20 new · typecheck, lint green |
| 2026-08-19 | F2.8 | `009_functions_triggers` — updated_at by catalogue loop, idempotent signup trigger, `complete_lesson_session` as a pure transaction boundary, pg_cron auto-submit, execute revoked from every client role | `pnpm test` 145/145 — 20 new · typecheck, lint green |
| 2026-08-18 | F2.7 | `correct_answer` protection — already unreachable after 008, so this ships the regression lock instead of redundant SQL: privilege sweep over every column and role, no-view assertion, static sweep of every migration | `pnpm test` 125/125 — 9 new · typecheck, lint green |
| 2026-08-18 | F2.6 | `008_rls_policies` — revoke-first grants, one policy shape per learner table, no client delete, `exam_questions` unreachable, public certificate view | `pnpm test` 116/116 — 17 new, incl. the two-user script run as real `authenticated` roles · typecheck, lint green |
| 2026-08-18 | F2.5 | `007_indexes` — five indexes for the queries that run; the two already served by a `unique (...)` btree are documented, not duplicated; every index names its query in a `comment on index` | `pnpm test` 99/99 — 11 new cases, 5 of them `explain` against seeded PGlite · typecheck, lint green |
| 2026-08-18 | F2.4 | `005_notification_tables` + `006_certificates` — idempotency key, wrapping quiet hours, globally-unique push endpoint, revocable certificate | 85 passed (7 files); 16 new PGlite cases + 8 static | 
| 2026-08-18 | F2.3 | `004_exam_tables` — definitions, sections, attempts, questions, answers; one live attempt per exam enforced by a partial unique index; every score `numeric` | `pnpm test` 61/61 — 23 against real Postgres · typecheck, lint green |
| 2026-08-18 | F2.2 | `003_learner_tables` — profile + sessions, attempts, review queue, mastery, streaks; `profile_id` on every child, cascading from `auth.users` down | `pnpm test` 54/54 — 16 applied against real Postgres, incl. a full delete-the-user cascade · typecheck, lint green |
| 2026-08-18 | F2.1 | `001_extensions` + `002_content_tables` (7 content tables, RLS on, checks not enums) · `pnpm db:migrate` runner over `DATABASE_URL` — no Docker, no Supabase CLI | `pnpm test` 47/47 — 9 of them apply the migrations from empty in PGlite · typecheck, lint, build green |
| 2026-08-18 | F1.16 | Hosted-Supabase setup path — README getting-started, `.env.example` rewrite, `pnpm setup:check` doctor; **Docker removed everywhere** | `pnpm test` 26/26 · clean-clone walkthrough · typecheck, lint, build green |
| 2026-08-18 | F1.14 | Typed fetch client — `apiFetch`/`apiRequest` validate the `{data,meta}` envelope and the caller's schema, map problem+json onto `ApiError` | `pnpm test` 22/22 · typecheck, lint, build green |
| 2026-08-18 | F0.1 | `ARCHITECTURE.md` — layer diagram, folder tree, 24-token port table, 23-table DB list, 11 recorded decisions + 1 open question | `scripts/check-architecture-doc.sh` — 5/5 sections, 15/15 ports tokenised, `IMailer` correctly absent · PASSED |
| 2026-08-18 | — | Email deferred to v2 — notifications are in-app + push only; `RESEND_API_KEY` commented out | n/a — docs only |
| 2026-08-18 | — | Restructured to a **single Next.js app** (no separate backend); added `.env.example`, `.gitignore`, `16-environment.md` | n/a — docs only |
| 2026-08-18 | — | Claude Code setup: CLAUDE.md, build order, docs, commands, git rules | n/a — docs only |

---

## Blocked / failed

Anything currently `[!]`. This table must be **empty** before a new feature starts.

| Feature | What failed | Diagnosis | Fix in progress |
| --- | --- | --- | --- |
| — | — | — | — |
