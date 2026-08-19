# BUILD-ORDER-COMPLETE.md

The build contract for ShuddhoSpell: **what each phase must deliver and how it is proved.**

For **which single feature to work on right now**, read [`PROGRESS.md`](PROGRESS.md). This
file defines the phases; `PROGRESS.md` tracks the features inside them, one at a time.

## How to use it

0. **Preflight.** `ls -la .env .env.local 2>/dev/null`. Either file present → continue and never
   mention it again. Neither present → say so once and keep building everything that does not need
   live credentials. (Historic wording, no longer in force: stop and ask the user to
   create it from `.env.example`. No phase begins without it. Never read the file itself.
1. Read `CLAUDE.md` first, always.
2. Find the first phase below whose **Status** is not `DONE`. That is the only phase you may work on.
3. Read the docs listed under *Reads*.
4. **Branch.** From an up-to-date `dev`, never from `main`:
   `git checkout dev && git pull origin dev && git checkout -b feat/<phase>-<slug>`.
   One phase = one feature branch. The branch name for each phase is given below.
5. Build the phase's features **one at a time**, in `PROGRESS.md` order. Each feature: build →
   write its tests → run them → fix any failure before starting the next → mark `[x]`.
   Never two features at once. Never a `[!]` left behind.
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
- **Status:** DONE
- **Completed:** 2026-08-18 — the architecture record, the docs set and the tracker.
  Status corrected 2026-08-19: it had read NOT STARTED while `PROGRESS.md` said COMPLETE.
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

## Phase 1 — App scaffold, tooling, contracts

- **Branch:** `feat/01-app-scaffold` (from `dev`)
- **Status:** DONE
- **Completed:** 2026-08-18 — F1.1 … F1.14, 12 of 14 built in full. Two parts are deferred to
  the phase that owns their dependency, and each re-opens with an id there: F1.9's rate limiting
  needs `IRateLimiter` and a `rate_limits` table Phase 2 did not ship (→ **F4.10a**), and F1.11's
  `/api/v1/openapi.json` needs v1 Zod schemas that do not exist until the presentation DTOs
  (→ **F5.9a**). Status corrected 2026-08-19: it had read NOT STARTED.
- **Reads:** `01-architecture`, `02-typescript-rules`, `11-api-surface`, `12-design-system`, `14-quality-gates`, `16-environment`
- **Deliverables:**
  - **A single Next.js 15 app at the repo root.** One `package.json`. No monorepo, no
    `apps/`, no separate server project. Working `dev` / `build` / `lint` / `typecheck` /
    `test` scripts.
  - Strict tsconfig with every flag from `02-typescript-rules`; flat ESLint config with
    `typescript-eslint` strict-type-checked, `eslint-plugin-import` (`no-cycle`), and a rule
    banning `type` aliases for object literal shapes. Prettier.
  - `eslint-plugin-boundaries` configured for the five zones: `domain`, `application`,
    `infrastructure`, `presentation`, `app`.
  - `src/contracts`: the interface + Zod convention proven with three real examples —
    `IApiResponse<T>`, `IProblemDetails`, `IPaginatedResult<T>`. Interface first, schema
    second, compile-time `satisfies` assertion third. Barrel per domain area.
  - `src/lib/env.ts`: split server/public Zod schemas, `server-only` on the server half,
    failing loudly at boot with the offending variable named. `.env.example` complete.
  - `src/lib/supabase/`: the session client and the `server-only` service client. Nothing
    else in the codebase constructs a client.
  - `withApi`: the one route-handler wrapper — auth, Zod parsing of body/query/params, rate
    limiting via `IRateLimiter`, request id, pino log line, and problem+json error mapping.
  - `src/composition/`: the composition root, with a per-request container factory.
  - `/api/health`, `/api/ready`, and `/api/v1/openapi.json` generated from the Zod schemas.
  - Tailwind wired to the exact design tokens and the four font families; `next-intl` with
    `en` + `bn` catalogues; a typed fetch client validating every response and throwing
    `ApiError` on mismatch.
  - Vitest configured for unit, integration and component tests. Playwright installed.
  - `README.md` setup steps against a hosted Supabase project, plus `pnpm setup:check`.
    **No Docker, no local database stack.**
- **Exit gate:**
  - [ ] A deliberate `domain → infrastructure` import fails lint. Output pasted. Import removed.
  - [ ] A deliberate `src/app → domain` import fails lint. Output pasted. Import removed.
  - [ ] A deliberate `type Foo = { … }` object alias fails lint. Output pasted. Alias removed.
  - [ ] Importing the service client from a Client Component fails the build. Output pasted.
  - [ ] Removing a required env var stops boot and prints that variable's name.
  - [ ] `pnpm typecheck && pnpm lint && pnpm test` all clean.
  - [ ] `/api/health`, `/api/ready` and `/api/v1/openapi.json` respond locally.
  - [ ] `git ls-files | grep -c "^apps/"` is 0 — there is no second project.

---

## Phase 2 — Database schema, migrations, RLS

- **Branch:** `feat/02-database-schema` (from `dev`)
- **Status:** DONE
- **Completed:** 2026-08-19 — F2.1 … F2.10, exit gate run and green. The one item not provable
  in CI is the hosted apply: `pnpm db:migrate` writes to the user's live Supabase project, so it
  is theirs to run. Apply-from-empty is proved on every `pnpm test` against a real Postgres
  (PGlite/WASM) instead.
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
  - [ ] Migrations apply cleanly from empty against a fresh Supabase project.

---

## Phase 3 — Authentication (Google only)

- **Branch:** `feat/03-google-auth` (from `dev`)
- **Status:** IN PROGRESS
- **Completed:** F3.1 and F3.2 shipped 2026-08-19; F3.3 … F3.12 remain.
  Status corrected 2026-08-19: it had read NOT STARTED.
- **Reads:** `04-authentication`, `01-architecture`
- **Deliverables:** `@supabase/ssr` cookie sessions; `/login` (one heading, one line, one Google
  button); `/auth/callback` code exchange routing to `/onboarding` or `/dashboard`;
  session-refresh middleware protecting every route by default; the **three** user-reading
  helpers and no others — `requireUser()` (Server Components), `withApi({ auth })` (handlers),
  `useSession()` (Client Components); the `CRON_SECRET` bearer check for `/api/cron/*`;
  `BootstrapProfileUseCase` (idempotent); `GET /api/v1/me`.
- **Exit gate:**
  - [ ] No session → protected page redirects to `/login`; protected handler returns 401 problem+json.
  - [ ] Valid session → 200. An `auth: 'public'` route → 200 unauthenticated.
  - [ ] An expired cookie is refreshed by middleware, or 401 — never a 500. A tampered cookie → 401.
  - [ ] A body carrying another user's `profileId` is ignored; the session's profile is used.
  - [ ] `/api/cron/*` without the bearer secret → 401.
  - [ ] `grep -ri "password\|magic.link\|signInWithOtp" src/` returns nothing in app code.
  - [ ] `/login` contains exactly one button and zero input elements.

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
  - [ ] No route handler contains a conditional that is a business rule.
  - [ ] Every DB-touching handler declares `runtime = 'nodejs'`; lesson handlers declare `dynamic = 'force-dynamic'`.
  - [ ] The Server Component read path and the handler path call the **same** use case.

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
  (seed-deterministic); the ten use cases; the `pg_cron` auto-submit job for abandoned attempts,
  plus `/api/cron/exam-autosubmit` as a backstop guarded by `CRON_SECRET`.
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
- **Scope note:** **two channels only — in-app and web push. No email.** Do not implement
  `IMailer`, do not add Resend or SMTP, do not read `RESEND_API_KEY`. Email is a v2 decision;
  `email` stays in the channel union and the DB check constraint so v2 needs no migration.
- **Deliverables:** notification entities + `NotificationPolicy`; `IPushSender` (web-push/VAPID)
  and `IInAppNotifier`; the preference/list/read use cases and one dispatch use case per
  type; hourly timezone-aware dispatch via `/api/cron/notifications` (Vercel Cron + `CRON_SECRET`); idempotency via unique
  `(profile_id, type, scheduled_for)`. Frontend: service worker, inline permission banner
  (never a modal), bell popover, toast system, preferences table with **In-app / Push** columns.
- **Exit gate:**
  - [ ] Policy tests: quiet hours spanning midnight · a disabled channel · a push endpoint
        returning 410 (must self-clean) · a UTC+6 learner with a 20:00 reminder.
  - [ ] The reminder job runs hourly and selects by learner local time, not server-local hour.
  - [ ] `/api/cron/notifications` rejects a request without the bearer secret.
  - [ ] A retried dispatch cannot double-send. Proven by test.
  - [ ] A preference requesting the `email` channel is never selected and never attempts a send.
  - [ ] No mail dependency in `package.json`; `grep -ri "resend\|nodemailer\|smtp" src/` is empty.
  - [ ] The preferences UI has no Email column — not greyed out, not "coming soon".

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
- **Deliverables:** app shell (232px primary-900 sidebar collapsing to 56px, 48px top bar, 1280px
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
  `/exams/attempt/[id]` (primary-900 runtime, no navigation out, server-driven countdown with local
  interpolation, question navigator with answered/current/flagged/blank states) ·
  `/exams/result/[id]` (pass and fail variants) · `/exams/review/[id]` · `/certificate/[id]` ·
  `/` (marketing landing) · `/login` · `/onboarding`.
- **Exit gate:**
  - [ ] The countdown is driven by the server's remaining seconds; a refresh resumes cleanly.
  - [ ] Timer turns `secondary-500` at 5:00 and `tertiary-500` at 0:60, each with an `aria-live` announcement.
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
  - [ ] CI runs typecheck, lint, unit, integration (Supabase service container), e2e, build — one app, one build job.
  - [ ] Migrations deploy as a gated step.
  - [ ] An honest closing list: what is incomplete, what is fragile, what to build next.

---

## Cross-phase invariants — check on every phase exit

- [ ] Work happened on the phase's feature branch, never on `main`, never on `dev`.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green **before** the push, output pasted.
- [ ] Nothing was force-pushed. No branch was deleted. `--no-verify` was not used.
- [ ] No secret, key, token or `.env` file in the diff. No `.env*` file was ever read or written.
- [ ] The PR targets `dev`. `main` was not touched.
- [ ] Lint boundaries pass with no rule loosened or disabled.
- [ ] No `type` object alias, no `enum`, no `any`, no `as` outside a post-Zod boundary, no `!`.
- [ ] No secret in code; env still validated at boot.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean.
- [ ] `ARCHITECTURE.md` updated with any unspecified decision made this phase.
- [ ] Every feature of this phase is `[x]` in `PROGRESS.md`, each with passing tests.
- [ ] The **Blocked / failed** table in `PROGRESS.md` is empty.
- [ ] The `NEXT` pointer and the `Log` in `PROGRESS.md` are up to date.
