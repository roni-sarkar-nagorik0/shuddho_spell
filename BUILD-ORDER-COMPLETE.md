# BUILD-ORDER-COMPLETE.md

The build contract for ShuddhoSpell. **This file is the source of truth for what to do next.**

## How to use it

1. Read `CLAUDE.md` first, always.
2. Find the first phase below whose **Status** is not `DONE`. That is the only phase you may work on.
3. Read the docs listed under *Reads*.
4. **Branch.** From an up-to-date `dev`, never from `main`:
   `git checkout dev && git pull origin dev && git checkout -b feat/<phase>-<slug>`.
   One phase = one feature branch. The branch name for each phase is given below.
5. Build only what is under *Deliverables*.
6. Run the *Exit gate*. Paste the actual command output.
7. **Only if the gate is fully green:** commit, push the feature branch, open a PR into `dev`.
   Never push to `dev` directly. Never touch `main`. See `.claude/docs/15-git-workflow.md`.
8. Flip **Status** to `DONE`, fill in the *Completed* line, and append anything unspecified
   you decided to `ARCHITECTURE.md`.
9. Stop. Report. Wait for the next instruction.

Status values: `NOT STARTED` · `IN PROGRESS` · `BLOCKED — <reason>` · `DONE`

**Never mark a phase `DONE` with a failing or skipped gate item.** A partial phase stays
`IN PROGRESS` with a written list of what remains.

**Never push a phase whose gate is not green.** A red gate means the branch stays local.

---

## Phase 0 — Specification and architecture record

- **Branch:** `docs/00-architecture-record` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** all of `.claude/docs/`
- **Deliverables:**
  - `ARCHITECTURE.md` — layer dependency diagram, full folder tree, token/port table,
    database table list, and a "decisions I made that were not specified" section.
  - Confirm `CLAUDE.md` matches reality; amend it if a rule needs sharpening.
- **Writes no code.**
- **Exit gate:**
  - [ ] `ARCHITECTURE.md` exists and covers all five required sections.
  - [ ] The phase list in this file is confirmed or amended with reasons.

---

## Phase 1 — Monorepo, tooling, contracts

- **Branch:** `feat/01-monorepo-scaffold` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `01-architecture`, `02-typescript-rules`, `11-api-surface`, `12-design-system`, `14-quality-gates`
- **Deliverables:**
  - pnpm workspace + Turborepo: `apps/api`, `apps/web`, `packages/contracts`, `packages/config`.
    Working `dev` / `build` / `lint` / `typecheck` / `test` pipelines.
  - `packages/config`: base tsconfig with every strict flag; shared flat ESLint config with
    `typescript-eslint` strict-type-checked, `eslint-plugin-boundaries`, `eslint-plugin-import`
    (`no-cycle`), and a rule banning `type` aliases for object literal shapes. Prettier.
  - `packages/contracts`: the interface + Zod convention proven with three real examples —
    `IApiResponse<T>`, `IProblemDetails`, `IPaginatedResult<T>`. Interface first, schema second,
    compile-time `satisfies` assertion third. Barrel per domain area, never one giant index.
  - `apps/api`: NestJS scaffold with global `ZodValidationPipe`, global exception filter emitting
    `application/problem+json`, global `ThrottlerGuard`, pino logging with request ids,
    `/health` and `/ready`, Swagger at `/docs`, boundaries plugin configured for the four layers.
  - `apps/web`: Next.js App Router scaffold, Tailwind wired to the exact design tokens and four
    font families, `next-intl` with `en` + `bn` catalogues, typed fetch client that validates every
    response against the contracts schema and throws a typed `ApiError` on mismatch.
  - Zod env validation in both apps, failing loudly at boot with the offending var named.
  - Docker Compose for local Supabase + `README.md` with exact setup steps.
- **Exit gate:**
  - [ ] A deliberate `domain → infrastructure` import fails lint. Output pasted. Import removed.
  - [ ] A deliberate `type Foo = { … }` object alias fails lint. Output pasted. Alias removed.
  - [ ] `pnpm typecheck && pnpm lint && pnpm test` all clean.
  - [ ] `/health`, `/ready` and `/docs` respond locally.

---

## Phase 2 — Database schema, migrations, RLS

- **Branch:** `feat/02-database-schema` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `03-database`, `05-domain-model`
- **Deliverables:** numbered, idempotent, forward-only SQL in `supabase/migrations`:
  `001_extensions` · `002_content_tables` · `003_learner_tables` · `004_exam_tables` ·
  `005_notification_tables` · `006_certificates` · `007_indexes` · `008_rls_policies` ·
  `009_functions_triggers` · `010_seed_reference` (44 real phonemes, 24 real rule families).
  Plus hand-written row interfaces in infrastructure (never in domain), verified against
  `supabase gen types` but not generated from it.
- **Exit gate:**
  - [ ] Every table has `id uuid default gen_random_uuid()`, `created_at`, `updated_at` + trigger.
  - [ ] Scores and money-like columns are `numeric`, never `float`.
  - [ ] RLS on for every learner table; content tables readable by any authenticated user, writable by none.
  - [ ] The two-user policy test script proves user A cannot read user B's attempts,
        review items, exam attempts or notifications. Output pasted.
  - [ ] `exam_questions.correct_answer` is unreachable except via the service role.
  - [ ] `auth.users` insert trigger creates a `learner_profiles` row.
  - [ ] Migrations apply cleanly from empty on `pnpm db:reset`.

---

## Phase 3 — Authentication (Google only)

- **Branch:** `feat/03-google-auth` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `04-authentication`, `01-architecture`
- **Deliverables:** `@supabase/ssr` cookie sessions, `/login` (one heading, one line, one Google
  button), `/auth/callback` code exchange routing to `/onboarding` or `/dashboard`, session-refresh
  middleware, `useSession()` + `requireUser()`. On the API: `SupabaseJwtGuard` (jose, JWKS cache,
  `iss`/`aud`/`exp`), global `APP_GUARD`, `@Public()`, `@CurrentUser()`, augmented Express `Request`
  in a `.d.ts`, `BootstrapProfileUseCase` (idempotent), `GET /api/v1/me`.
- **Exit gate:**
  - [ ] Guard unit tests cover expired, wrong-audience, wrong-issuer, malformed and missing tokens.
  - [ ] E2E: protected route 401 without token, 200 with a valid one.
  - [ ] E2E: a `@Public()` route is reachable unauthenticated.
  - [ ] `grep -ri "password\|magic.link\|signInWithOtp" apps/` returns nothing in app code.
  - [ ] No `any` and no `as` on the request object.

---

## Phase 4 — Domain and application layers

- **Branch:** `feat/04-domain-application` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `05-domain-model`, `06-spaced-repetition`, `01-architecture`, `02-typescript-rules`
- **Deliverables:** entities, value objects, repository ports (+ Symbol tokens), domain services
  (`ReviewSchedulingPolicy`, `MasteryCalculator`, `ErrorTagger`), application ports (`IClock`,
  `IIdGenerator`, `ISpeechScorer`, `IUnitOfWork`), and the twelve use cases listed in
  `05-domain-model`. Pure TypeScript — zero Nest decorators in `domain`, zero Supabase anywhere.
- **Exit gate:**
  - [ ] Every use case has a unit test using in-memory fakes and a `FakeClock`. No Nest `TestingModule`.
  - [ ] Edge cases covered: stage submitted out of order · session resumed next day ·
        review item answered correctly twice on the same calendar day (must count once) ·
        streak across a timezone change · attempt on a word not in today's lesson.
  - [ ] `domain` and `application` coverage ≥ 90%. Numbers pasted per module.
  - [ ] `grep -rn "supabase\|@nestjs" src/modules/*/domain/` returns nothing.

---

## Phase 5 — Infrastructure and presentation wiring

- **Branch:** `feat/05-infrastructure` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `03-database`, `01-architecture`, `11-api-surface`
- **Deliverables:** one repository implementation per port; a single `SupabaseClientProvider`
  (no other file constructs a client); bidirectional row↔entity mappers (the only place that knows
  snake_case); `IUnitOfWork` over Postgres functions for multi-table writes; batched reads;
  Postgres error-code mapping (23505 / 23503 / 40001 with one retry). Thin controllers for
  program, lessons and review.
- **Exit gate:**
  - [ ] No row interface escapes `infrastructure/`. Proven by grep.
  - [ ] `GetLearnerDashboard` has no N+1 — query count asserted in a test.
  - [ ] Session completion writes attempts + review items + mastery + streak atomically,
        via a Postgres function, not TypeScript sequencing.
  - [ ] Integration tests run against a real local Supabase, seeded and torn down per suite.
  - [ ] No controller contains a conditional that is a business rule.

---

## Phase 6 — Speech scoring

- **Branch:** `feat/06-speech-scoring` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `07-speech-scoring`
- **Deliverables:** `ISpeechScorer` implementation; G2P lookup stored in the `words` table (not
  computed at runtime); `BengaliConfusionMap` declared as data; the 50/50 Levenshtein + phoneme
  blend with the ≥65 floor on a known single-phoneme confusion; `IPronunciationScore` with
  `perPhoneme` and named diagnoses; the pronunciation attempt endpoint plus per-phoneme mastery
  write-through.
- **Exit gate:**
  - [ ] Table-driven suite of ≥40 real cases: correct · near-miss on each confusion pair ·
        completely wrong · empty transcript · homophone · transcript with extra words.
  - [ ] A near miss scores 65–90 and never 0. Asserted.
  - [ ] The confusion map covers at minimum v↔w, θ→t, ð→d, z→j, ʃ↔s, æ→e, epenthetic vowel
        before /sk/ /sp/ /st/, dropped final clusters, first-syllable stress errors.
  - [ ] Every diagnosis carries `expected`, `heard`, `articulationFix`.
  - [ ] No audio reaches the server unless the learner opted into storage.

---

## Phase 7 — Exam engine

- **Branch:** `feat/07-exam-engine` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `08-exam-engine`, `05-domain-model`
- **Deliverables:** exam entities; pure `ExamScoringService` and `ExamBlueprintService`
  (seed-deterministic); the ten use cases; the pg_cron auto-submit job for abandoned attempts.
- **Exit gate:** every item below has a test that fails if the behaviour breaks.
  - [ ] `serverDeadlineAt` set at start, never extended.
  - [ ] Any write past the deadline → 409 `EXAM_TIME_EXPIRED`.
  - [ ] Snapshot test over **every** exam response body asserts `correct_answer` is absent
        before submission.
  - [ ] A submitted section cannot be reopened by any endpoint.
  - [ ] A fourth `milestone1` attempt → 409 `EXAM_ATTEMPTS_EXHAUSTED`; cooldowns enforced server-side.
  - [ ] `GetActiveExamAttempt` returns remaining seconds from the server clock; a browser
        crash loses nothing.
  - [ ] Passing advances `currentDayIndex`; failing writes a drill prescription into `review_items`.
  - [ ] `GetExamReadiness` returns a predicted score and the three costliest topics.
  - [ ] pg_cron auto-submits abandoned attempts so a stale attempt never blocks a retake.

---

## Phase 8 — Notifications

- **Branch:** `feat/08-notifications` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `09-notifications`
- **Deliverables:** notification entities + `NotificationPolicy`; `IPushSender` (web-push/VAPID),
  `IMailer`, `IInAppNotifier`; the preference/list/read use cases and one dispatch use case per
  type; hourly timezone-aware scheduling; idempotency via unique
  `(profile_id, type, scheduled_for)`. Frontend: service worker, inline permission banner
  (never a modal), bell popover, toast system, preferences table.
- **Exit gate:**
  - [ ] Policy tests: quiet hours spanning midnight · a disabled channel · a push endpoint
        returning 410 (must self-clean) · a UTC+6 learner with a 20:00 reminder.
  - [ ] The reminder job runs hourly and selects by learner local time, not server-local hour.
  - [ ] A retried dispatch cannot double-send. Proven by test.

---

## Phase 9 — Content pipeline and seeding

- **Branch:** `feat/09-content-pipeline` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `10-content-pipeline`, `05-domain-model`
- **Deliverables:** typed `content/` source files (one per week) validated by Zod at build time;
  `pnpm content:seed` CLI that validates → diffs → applies only changes; 1,240 words across 28 days;
  560 sentence items; 44 phonemes with real articulation notes; 24 rule families with a statement,
  3 examples, 2 counterexamples.
- **Process:** generate **one week at a time**, run the validator after each week, report counts back
  before continuing. Never batch more than a week — truncation silently loses content.
- **Exit gate:**
  - [ ] A malformed word entry fails the build naming the exact file and line.
  - [ ] Counts verified: 1,240 words, 560 sentence items, 44 phonemes, 24 rule families.
  - [ ] Every word has ≥2 realistic `commonMisspellings`; every sentence ≥2 `acceptedAlternatives`.
  - [ ] Uncertain IPA is flagged `ipaNeedsReview: true` and the full list is reported. Nothing invented.
  - [ ] Re-running the seed is a no-op diff.

---

## Phase 10 — Web shell and core components

- **Branch:** `feat/10-web-shell` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `12-design-system`, `13-frontend`
- **Deliverables:** app shell (232px ink-900 sidebar collapsing to 56px, 48px top bar, 1280px
  12-column content region); `PhonemeStrip` and `MasteryMatrix` built once, properly, typed, tested,
  Storybook-documented; the primitive layer (`DataTable`, `StatCell`, `PanelHeader`, `HeatCell`,
  `MonoValue`, `StatusBadge`, `Sparkline`, `Toast`, `Popover`, `Drawer`, `ConfirmDialog`);
  TanStack Query wiring with optimistic answer saving and **no retry on exam writes**;
  `next-intl` CI check failing on any `en` key missing from `bn`.
- **Exit gate:**
  - [ ] `MasteryMatrix` renders 44 cells or 24 cells from one component via a `dimension` prop.
  - [ ] Storybook builds; screenshots of both signature components in three states each.
  - [ ] The i18n key-parity check fails on a deliberately removed `bn` key. Output pasted. Key restored.
  - [ ] No shadows outside overlays, no gradients, no emoji, no illustration.

---

## Phase 11 — Learning screens

- **Branch:** `feat/11-learning-screens` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `13-frontend`, `06-spaced-repetition`, `07-speech-scoring`
- **Deliverables:** `/dashboard` · `/program` · `/lesson/[day]` (five-stage tracker: Learn, Dictate,
  Speak, Build) · `/practice` · `/weak-spots` · `/library` · `/progress`.
- **Exit gate:**
  - [ ] Dictation tiles: real keyboard input, auto-advance, backspace moves back **and** clears,
        arrow-key navigation, paste blocked, Enter submits — fully operable with no mouse.
  - [ ] The mic flow feature-detects `SpeechRecognition` and renders the self-assessment fallback
        on unsupported browsers, never a dead button.
  - [ ] Sentence chips reorder by pointer **and** by keyboard as a first-class path.
  - [ ] Every audio play cancels the previous utterance — no overlap.
  - [ ] Library table supports filters, column control, CSV export and the detail drawer.

---

## Phase 12 — Exam and marketing screens

- **Branch:** `feat/12-exam-marketing-screens` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `08-exam-engine`, `13-frontend`, `12-design-system`
- **Deliverables:** `/exams` · `/exams/[code]` (lobby with system check, gated begin button) ·
  `/exams/attempt/[id]` (ink-900 runtime, no navigation out, server-driven countdown with local
  interpolation, question navigator with answered/current/flagged/blank states) ·
  `/exams/result/[id]` (pass and fail variants) · `/exams/review/[id]` · `/certificate/[id]` ·
  `/` (marketing landing) · `/login` · `/onboarding`.
- **Exit gate:**
  - [ ] The countdown is driven by the server's remaining seconds; a refresh resumes cleanly.
  - [ ] Timer turns `signal` at 5:00 and `error` at 0:60, each with an `aria-live` announcement.
  - [ ] `beforeunload` warning during an active attempt.
  - [ ] The landing page is a statically rendered Server Component scoring ≥95 Lighthouse
        performance and 100 accessibility. Report attached.
  - [ ] `/login` contains exactly one button.

---

## Phase 13 — Hardening and delivery

- **Branch:** `feat/13-hardening` (from `dev`)
- **Status:** NOT STARTED
- **Completed:**
- **Reads:** `14-quality-gates`, all others as needed
- **Deliverables:** coverage to the floor with the weakest three modules fixed; Playwright e2e for
  the four flows that must never break (Google sign-in → dashboard · a complete day-12 lesson ·
  a full milestone2 exam including a mid-exam refresh · a failed exam producing its prescription);
  security pass; performance pass; observability; GitHub Actions CI; `README.md` and `DECISIONS.md`.
- **Exit gate:**
  - [ ] Domain + application coverage ≥ 90%, per-module numbers reported.
  - [ ] All four Playwright flows green.
  - [ ] RLS re-verified with the phase-2 two-user script; no `correct_answer` leak; rate limits on
        every write route; security headers + CSP; no secret in the client bundle.
  - [ ] p95 ≤ 200ms on read routes; N+1 audit clean; bundle budget met.
  - [ ] CI runs typecheck, lint, unit, integration (Supabase service container), e2e, build.
  - [ ] Migrations deploy as a gated step.
  - [ ] An honest closing list: what is incomplete, what is fragile, what to build next.

---

## Cross-phase invariants — check on every phase exit

- [ ] Work happened on the phase's feature branch, never on `main`, never on `dev`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green **before** the push, output pasted.
- [ ] Nothing was force-pushed. No branch was deleted. `--no-verify` was not used.
- [ ] No secret, key, token or `.env` in the diff.
- [ ] The PR targets `dev`. `main` was not touched.
- [ ] Lint boundaries pass with no rule loosened or disabled.
- [ ] No `type` object alias, no `enum`, no `any`, no `as` outside a post-Zod boundary, no `!`.
- [ ] No secret in code; env still validated at boot.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean.
- [ ] `ARCHITECTURE.md` updated with any unspecified decision made this phase.
