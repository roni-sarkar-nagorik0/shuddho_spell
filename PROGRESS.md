# PROGRESS.md — feature tracker

**One feature at a time. Test it. Fix it if it fails. Only then move on.**

This file is the live state of the build. `BUILD-ORDER-COMPLETE.md` says what the phases are;
this file says exactly where you are inside them.

---

## How to read and update this file

| Mark | Meaning |
| --- | --- |
| `[ ]` | not started |
| `[~]` | in progress — **only ever one of these in the whole file** |
| `[x]` | done: built, tested, tests green, merged into `dev` |
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
5. **If the tests fail:** mark it `[!]`, debug, fix, re-run. Do **not** start another feature.
   Do **not** move on. Do **not** leave it half-done for later.
6. When tests are green: mark it `[x]`, add the date, add a one-line note in the **Log**.
7. Commit and push the feature branch (see `.claude/docs/15-git-workflow.md`).
8. Move the **NEXT** pointer to the following `[ ]`. Stop and report.

### Absolute rules

- **Check the env file once, never read it**, and never block the build on it twice.
- **Never work on two features at once.** One `[~]` in this file, ever.
- **Never mark `[x]` without tests written and green.** "It works when I try it" is not a test.
- **Never leave a feature incomplete.** A `[!]` blocks the whole build until it is `[x]`.
- **Never skip ahead** to a more interesting feature because the current one is awkward.
- **Never delete or weaken a test** to turn `[!]` into `[x]`.
- A feature is done when it is built **and** tested **and** merged into `dev` — not before.

---

## NEXT

> **Phase 2 · F2.9 — `010_seed_reference` (44 real phonemes, 24 real rule families)**
> Branch: `feat/02-database-schema`
> Migrations now run for real: `pnpm db:migrate` against hosted Supabase, and every migration
> is applied from empty inside a WASM Postgres (PGlite) by `migrations.apply.test.ts` in CI.
> Phase 1's only open items are the two carry-overs that genuinely need later phases:
> F1.9 (rate limiter, needs the Phase 2 tables) and F1.11 (OpenAPI, needs the v1 schemas).

Update this block every time a feature is finished.

---

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
Branch `feat/01-app-scaffold` · Status: `IN PROGRESS`

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
- [~] **F1.9** `withApi` wrapper — auth, Zod body/query/params, rate limit, request id, pino, problem+json
  - Built: auth, Zod body/query, request id, pino, problem+json. **Remaining: rate limiting**, which
    needs the Postgres-backed `IRateLimiter` and therefore Phase 2. Finish it there, not here.
  - Test: a bad body returns problem+json with a stable `code`; a request id appears in the log line
- [x] **F1.10** (2026-08-18) `src/composition/` — per-request container factory
  - Test: a use case can be constructed with fakes and no container at all
- [~] **F1.11** `/api/health`, `/api/ready`, `/api/v1/openapi.json`
  - Built: `/api/health` and `/api/ready`, both unauthenticated. **Remaining: `/api/v1/openapi.json`**,
    which must be generated from the v1 Zod schemas — none exist until Phase 4/5.
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
Branch `feat/02-database-schema` · Status: `IN PROGRESS`

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
- [ ] **F2.9** `010_seed_reference` — 44 real phonemes, 24 real rule families
  - Test: counts are exactly 44 and 24; no placeholder text
- [ ] **F2.10** Hand-written row interfaces in `infrastructure/`
  - Test: `supabase gen types` output matches them; no row interface outside `infrastructure/`

---

## Phase 3 — Authentication (Google only)
Branch `feat/03-google-auth` · Status: `NOT STARTED`

- [ ] **F3.1** `@supabase/ssr` cookie session client
  - Test: the session cookie is httpOnly
- [ ] **F3.2** `/login` — one heading, one line, one Google button
  - Test: the page contains exactly one button and zero input elements
- [ ] **F3.3** `/auth/callback` code exchange + new-vs-existing routing
  - Test: a new profile lands on `/onboarding`, an existing one on `/dashboard`
- [ ] **F3.4** Session-refresh middleware and route protection
  - Test: an unauthenticated request to `/dashboard` redirects to `/login`
- [ ] **F3.5** `useSession()` + `requireUser()`
  - Test: `requireUser()` throws/redirects with no session
- [ ] **F3.6** `withApi({ auth: 'required' })` session resolution
  - Test: no session → 401 problem+json; expired cookie → refreshed or 401, never 500; tampered cookie → 401
- [ ] **F3.7** Protected-by-default routing; `auth: 'public'` as the explicit opt-out
  - Test: a protected handler 401s without a session; a public one returns 200
- [ ] **F3.8** `CRON_SECRET` bearer check for `/api/cron/*`, constant-time compare
  - Test: a request without the secret → 401; the secret never appears in a log line
- [ ] **F3.9** `BootstrapProfileUseCase`, idempotent
  - Test: two concurrent first requests produce exactly one profile, no 500
- [ ] **F3.10** `GET /api/v1/me`
  - Test: returns profile + program position for a valid token
- [ ] **F3.11** No email/password path exists
  - Test: `grep -ri "password\|magic.link\|signInWithOtp" src/` returns nothing in app code
- [ ] **F3.12** Identity comes only from the session
  - Test: a body carrying another user's `profileId` is ignored; the session's profile is used

---

## Phase 4 — Domain and application layers
Branch `feat/04-domain-application` · Status: `NOT STARTED`

- [ ] **F4.1** Value objects — `DayIndex`, `ScorePercent`, `IpaTranscription`, `Track`, `ErrorTag`
  - Test: each rejects out-of-range construction
- [ ] **F4.2** Content entities — `Phoneme`, `Word`, `RuleFamily`, `SentenceItem`, `ProgramDay`
  - Test: construction from valid data; readonly enforced at compile time
- [ ] **F4.3** `LearnerProfile` + `LessonSession.advanceStage()`
  - Test: legal order passes; skipping or reversing a stage is a domain error
- [ ] **F4.4** `ReviewItem.recordResult()` — the interval ladder
  - Test: correct advances one rung; rung 4 stays 4; wrong resets to rung 0 from every rung
- [ ] **F4.5** `ReviewSchedulingPolicy` behind `IReviewSchedulingPolicy`
  - Test: `1,3,7,16,35` appear nowhere outside the policy (grep)
- [ ] **F4.6** Mastery rule — 3 correct on 3 **different calendar days**
  - Test: two correct same day counts once; three across three days → `isMastered`
- [ ] **F4.7** `StreakRecord.registerActivity()` with timezone day boundaries
  - Test: a UTC+6 learner at 23:50 local; a learner who changes timezone mid-streak
- [ ] **F4.8** `MasteryCalculator` and `ErrorTagger`
  - Test: each named tag (`DOUBLE_CONSONANT`, `SILENT_LETTER`, `ARTICLE_MISSING`, `V_W_SUBSTITUTION`, …) is produced by a real wrong answer
- [ ] **F4.9** Repository ports + Symbol tokens (8 ports)
  - Test: every port has a token; no concrete class is injected anywhere
- [ ] **F4.10** Application ports — `IClock`, `IIdGenerator`, `ISpeechScorer`, `IUnitOfWork`
  - Test: no `Date.now()` / `new Date()` outside a clock adapter (grep)
- [ ] **F4.11** Program use cases — `GetProgramOverview`, `GetProgramDay`
  - Test: unit tests with in-memory fakes, no Nest `TestingModule`
- [ ] **F4.12** Lesson use cases — `StartLessonSession`, `AdvanceLessonStage`, `CompleteLessonSession`
  - Test: stage out of order rejected; a session resumed the next day works
- [ ] **F4.13** Attempt use cases — `SubmitDictationAttempt`, `SubmitConstructionAttempt`
  - Test: an attempt on a word not in today's lesson is rejected
- [ ] **F4.14** Review use cases — `GetDueReviewItems`, `SubmitReviewAttempt`
  - Test: 40 due items → 25 returned, most overdue first, ties by lowest accuracy
- [ ] **F4.15** Progress use cases — `GetMasterySnapshot`, `GetProgressSummary`, `GetLearnerDashboard`
  - Test: unit tests with fakes; coverage on `domain` + `application` ≥ 90%

---

## Phase 5 — Infrastructure and presentation wiring
Branch `feat/05-infrastructure` · Status: `NOT STARTED`

- [ ] **F5.1** Repositories use the `server-only` service client and nothing else
  - Test: grep finds no `createClient` outside `src/lib/supabase/`
- [ ] **F5.2** Row↔entity mappers, both directions
  - Test: round-trip mapping is lossless; no row interface escapes `infrastructure/`
- [ ] **F5.3** Repository implementations (8 ports)
  - Test: integration tests against real local Supabase, seeded and torn down per suite
- [ ] **F5.4** `IUnitOfWork` over a Postgres function for session completion
  - Test: a mid-write failure rolls back attempts, review items, mastery and streak together
- [ ] **F5.5** Postgres error-code mapping (23505 / 23503 / 40001 + one retry)
  - Test: each code produces its typed domain error; 40001 retries exactly once
- [ ] **F5.6** Batched reads — no N+1 on the dashboard
  - Test: a query-count assertion on `GetLearnerDashboard`
- [ ] **F5.7** Program, lessons and review handlers via `withApi` + three-line route re-exports
  - Test: each handler invoked directly with a constructed `Request`; no business conditional in any handler; `runtime = 'nodejs'` declared
- [ ] **F5.8** Server Component read path calls the same use cases
  - Test: the dashboard Server Component and `GET /api/v1/progress/summary` run one implementation, not two

---

## Phase 6 — Speech scoring
Branch `feat/06-speech-scoring` · Status: `NOT STARTED`

- [ ] **F6.1** G2P lookup stored in the `words` table
  - Test: every seeded word resolves to a phoneme sequence
- [ ] **F6.2** `BengaliConfusionMap` as data
  - Test: all required pairs present — v↔w, θ→t, ð→d, z→j, ʃ↔s, æ→e, epenthetic /sk/ /sp/ /st/, dropped final clusters, stress
- [ ] **F6.3** Normalised Levenshtein similarity
  - Test: identical → 1.0; empty → 0; known distances match expected values
- [ ] **F6.4** Phoneme-level comparison with partial credit
  - Test: a single confused phoneme scores partial, not zero
- [ ] **F6.5** The 50/50 blend and the ≥65 clamp
  - Test: a near miss on **every** confusion pair scores 65–90, never 0
- [ ] **F6.6** `IPronunciationScore` with `perPhoneme` and named diagnoses
  - Test: every diagnosis carries `expected`, `heard`, `articulationFix`
- [ ] **F6.7** The ≥40-case table-driven suite
  - Test: correct · each confusion pair · completely wrong · empty transcript · homophone · extra words
- [ ] **F6.8** Pronunciation attempt endpoint + mastery write-through
  - Test: an attempt updates per-phoneme `mastery_records`; no audio reaches the server

---

## Phase 7 — Exam engine
Branch `feat/07-exam-engine` · Status: `NOT STARTED`

- [ ] **F7.1** Exam entities + `ExamStatus` union
  - Test: illegal status transitions rejected
- [ ] **F7.2** `ExamScoringService` — pure, no I/O
  - Test: section weights 35/20/30/15 applied; boundary case exactly at the pass mark
- [ ] **F7.3** `ExamBlueprintService` — seed-deterministic selection
  - Test: the same seed produces the same questions; weak items are preferred
- [ ] **F7.4** `StartExamAttempt` + `serverDeadlineAt`
  - Test: the deadline is set once and never extended, including on resume
- [ ] **F7.5** `SaveExamAnswer` / `FlagExamQuestion`
  - Test: a write past the deadline → 409 `EXAM_TIME_EXPIRED`
- [ ] **F7.6** `SubmitExamSection` — one-way locking
  - Test: a submitted section cannot be reopened by any endpoint
- [ ] **F7.7** Attempt limits and cooldowns
  - Test: a 4th `milestone1` attempt → 409 `EXAM_ATTEMPTS_EXHAUSTED`; a retake inside cooldown → 409 with remaining time
- [ ] **F7.8** `GetActiveExamAttempt` — crash-safe resume
  - Test: refresh at the 30-second mark resumes with server-computed remaining seconds
- [ ] **F7.9** No `correctAnswer` leak
  - Test: a snapshot over **every** exam response body asserts its absence before submission
- [ ] **F7.10** `SubmitExamAttempt` — pass advances, fail prescribes
  - Test: a pass advances `currentDayIndex`; a fail writes drills into `review_items`
- [ ] **F7.11** `GetExamResult` / `GetExamAnswerReview`
  - Test: review is unreachable before submission
- [ ] **F7.12** `GetExamReadiness`
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
