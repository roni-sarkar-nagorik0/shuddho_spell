# CLAUDE.md — ShuddhoSpell

Read this file at the start of **every** session, before writing a single line of code.
**Run the preflight in section 2 once, then build.**
Then read **`PROGRESS.md`** — it names the features that come next, which you build strictly
one at a time —
and `BUILD-ORDER-COMPLETE.md` for that phase's gate, and the `.claude/docs/` files it points at.

---

## 0. ACTIVE BUILD MODE — feature-first, verification paused

> **Set by the user on 2026-08-19. This block overrides any rule below that contradicts it.**
> The goal right now is **every feature built and visible**, not proved. Nothing in this repo
> has been deleted — the paused rules stay written exactly as they were, so the moment this
> block is removed the project is back under full discipline.
>
> **Paused — do not enforce, do not treat as a blocker:**
> - writing test cases for a feature (`PROGRESS.md` lists them; they are now *acceptance
>   criteria you build to*, not tests you must author)
> - `pnpm test`, `pnpm test:e2e`, and the 90% coverage floor on `domain` / `application`
> - every phase **exit gate** in `BUILD-ORDER-COMPLETE.md`
> - "a feature is `[x]` only when its tests are green"
> - "one phase per session" — see the run size below
>
> **Still live — these are not tests and the build breaks without them:**
> - `pnpm typecheck && pnpm lint` before every push. Without these the app does not compile
>   and no feature is visible, which is the whole point of the pause.
> - every architecture, TypeScript, auth and git rule in sections 3–5 and 10
> - if a test that already exists goes red, **say so** — never delete, `.skip` or weaken it
>
> **Run size while this block stands: `/build` completes FIVE phases per invocation**, in
> order, one feature at a time within each. See `.claude/commands/build.md`.
>
> **A feature is `[x]` when it is built and merged into `dev`.** Then date it, add the **Log**
> line, move **NEXT**.

---

## 1. What this project is

ShuddhoSpell is a production web application: a **28-day English precision-training
program for Bengali (Bangla) speakers** who misspell words, mispronounce them, and
cannot construct correct sentences.

Three engines carry the product: spaced repetition, pronunciation scoring, and a
server-authoritative exam engine. Everything else is delivery.

Full product detail: [`.claude/docs/00-overview.md`](.claude/docs/00-overview.md)

---

## 2. PREFLIGHT — run this once per session, then get on with it

```bash
ls -la .env .env.local 2>/dev/null
```

- **Either `.env` or `.env.local` exists** → the environment is the user's business. **Continue
  immediately.** Do not ask about it, do not mention it, do not re-check it later in the session.
- **Neither exists** → say one sentence — "no env file found; copy `.env.example` to `.env.local`
  and fill sections 1 and 2" — and continue with everything that does not need live credentials
  (scaffolding, types, domain logic, tests with fakes). Only stop at the first step that genuinely
  needs a real Supabase connection.

**The preflight is a one-line check, not a gate to relitigate.** If it passed once, it stays
passed. Never block a build on it twice in the same session.

That check is an **existence check only**. It uses `ls`. It does not read the file.

### The `.env` rule — absolute

**Never read, open, print, copy, edit, write, or move `.env`, `.env.local`, or any
`.env.*` file.** Not to "check a value", not to debug a connection, not to confirm a
variable is set, not because the user seemed to imply it, not even if asked in passing.

- ❌ `cat .env.local` · `head .env` · `grep SUPABASE .env.local` · Read tool on any `.env*`
- ❌ echoing a value, pasting one into a message, or copying one between files
- ❌ writing or editing `.env.local` — the user owns that file, always
- ✅ `ls -la .env .env.local` — existence only
- ✅ reading and editing **`.env.example`**, which holds placeholders only
- ✅ reading `src/lib/env.ts` to see which variables the schema requires

If you need to know whether a variable is set, **ask the user** or let the app's Zod boot
validation say so — it names the offending variable by design. That is the supported path.
Never inspect the file yourself.

If a task appears to require reading a secret, that task is wrong. Say so and stop.

---

## 3. Stack — non-negotiable

**One Next.js application. There is no separate backend project.** The App Router serves the
UI *and* the API. One `package.json`, one build, one deploy.

| Concern | Choice |
| --- | --- |
| App | Next.js 15 App Router, React 19, TypeScript strict — UI **and** API in one project |
| API | Route handlers under `src/app/api/v1/*`, built by the `withApi` wrapper |
| Client state | TanStack Query |
| Styling | Tailwind, tokens from `12-design-system.md` |
| Shared types | `src/contracts` — interfaces + Zod, used by both server and client |
| DB / Auth / Storage | Supabase (Postgres 15, Supabase Auth, Supabase Storage) |
| Migrations | Plain SQL in `supabase/migrations`. No ORM. No Prisma. |
| Scheduled work | `pg_cron` in the database + `/api/cron/*` handlers guarded by `CRON_SECRET` |
| Runtime | Node 20 LTS, pnpm |
| Tests | Vitest (unit, integration, component), Playwright (e2e) |

Do not add a dependency that replaces one of these. **Do not add a separate server project,
a NestJS app, an Express app, or a second deploy target.** Do not introduce an ORM, a second
state library, a component library, or a CSS-in-JS runtime.

---

## 4. The rules checklist — re-read this every session

### Architecture
- [ ] Four layers per feature module in `src/modules/<feature>/`: `domain/`, `application/`, `infrastructure/`, `presentation/`.
- [ ] Dependency rule: `domain` → nothing. `application` → domain. `infrastructure` → domain + application. `presentation` → application + contracts. `src/app` → presentation + contracts + components, never domain or infrastructure.
- [ ] A violation must fail **lint** (`eslint-plugin-boundaries`), not review. Never loosen the rule to make an import pass — introduce the missing port instead.
- [ ] Every port has a `Symbol` token declared beside its interface. Wiring happens **only** in `src/composition/` — a use case never reaches into the container.
- [ ] Use cases are plain classes. **No decorators anywhere.** Dependencies arrive as interfaces through the constructor.
- [ ] One use case per class, one public `execute(input): Promise<output>` method, with its own `IXInput` / `IXOutput` interfaces.
- [ ] A use case never receives a `Request`, a `NextRequest`, a `Response`, a Supabase client, or a raw DB row. It never reads `process.env`. It never calls `Date.now()` — it injects `IClock`.
- [ ] Route handlers are thin and built by `withApi`: it owns auth, Zod parsing, rate limiting, request ids and problem+json mapping. Business logic in a handler is a bug.
- [ ] `src/app/api/**/route.ts` files are three-line re-exports. All work lives in the module.
- [ ] `export const runtime = 'nodejs'` on every handler touching the database; `dynamic = 'force-dynamic'` on exam and lesson handlers.
- [ ] **Server Components call use cases directly** through the composition root — they never fetch their own API over HTTP. One implementation serves both paths.

### TypeScript
- [ ] Every object shape is an `interface`. Never `type`.
- [ ] `type` is allowed **only** for union, mapped, conditional, template-literal and tuple types.
- [ ] No `enum`. Use a frozen const object plus a derived union.
- [ ] No `any`. No `!` non-null assertion. No `as` except immediately after a validated Zod parse at a boundary.
- [ ] All entity and DTO properties are `readonly`. State changes return a new instance or go through an explicit entity method.
- [ ] Port and contract interfaces are `I`-prefixed. Entity classes are not. Files are kebab-case, one public exported symbol per file.
- [ ] Zod validates at the edges only — HTTP body, query, env, external API responses. Inside the app, types are trusted.
- [ ] The interface is the source of truth; the schema must *satisfy* it via a compile-time assertion.
- [ ] Expected domain failures return `IResult<T, E>`. Typed exceptions are thrown only at the application boundary and mapped by one global exception filter.

### Auth
- [ ] Google only. No email/password, no magic link, no second provider. No email input field exists anywhere in the codebase.
- [ ] Cookie sessions via `@supabase/ssr`. Only three ways to read the user: `requireUser()` in a Server Component, `withApi({ auth: 'required' })` in a handler, `useSession()` in a Client Component.
- [ ] Identity always comes from the server-verified session, never from the client body.
- [ ] Routes are protected by default; public by explicit `auth: 'public'`.
- [ ] `/api/cron/*` authenticates with `Bearer ${CRON_SECRET}`, compared in constant time.
- [ ] Exactly two Supabase clients exist: the session client and the `server-only` service client. Nothing else constructs one.
- [ ] RLS is on for every learner table and written as if the API did not exist.

### Quality
> **SUSPENDED 2026-08-19 by the user — the two `[~]` items below are not enforced.**
> They stay here as the standard to restore, not as a live requirement. Do not delete them.
> While this note stands: a feature does not need a unit test to ship, and no coverage
> number blocks anything. Every other item in this checklist is still live.

- [ ] Env vars validated with Zod at boot in `src/lib/env.ts`; the app refuses to start and names the offending var. Nothing else reads `process.env`.
- [ ] `.env.example` stays complete — a new variable without an entry there is a bug.
- [~] *(suspended)* Every use case has a unit test constructed directly: `new SomeUseCase(fakeRepo, fakeClock)`. No framework, no container.
- [~] *(suspended)* Coverage floor 90% on `domain` and `application`.
- [ ] No secret in code, ever, and none in the client bundle.

Detail and rationale: [`.claude/docs/01-architecture.md`](.claude/docs/01-architecture.md) and
[`.claude/docs/02-typescript-rules.md`](.claude/docs/02-typescript-rules.md).

---

## 5. Git rules — absolute, no exceptions

Full detail: [`.claude/docs/15-git-workflow.md`](.claude/docs/15-git-workflow.md)

```
main   ← protected. Never commit, never push, never merge into it. Human-merged PR from dev only.
dev    ← integration branch. You merge feature branches straight in — see rule 2.
feat/… ← one branch per phase, carrying every feature in it. Where you work.
```

1. **Never touch `main`.** No commit, no push, no merge, no force-push, no rebase onto it.
   Not for a hotfix, not for a typo. If something must reach `main`, say so and stop —
   a human merges the `dev` → `main` PR.
2. **Always work on a feature branch, then merge it into `dev` yourself.**
   `feat/<phase>-<slug>`, branched from an up-to-date `dev`, never from `main`. Push the
   branch, then `git checkout dev && git pull origin dev`, merge it in, push `dev`, and
   `git merge --ff-only dev` back onto the branch so the next merge stays simple.
   **The user asked for this on 2026-08-19**, overriding the older "lands here via PR" rule.
   A merge commit is fine when it will not fast-forward. **Never rebase a pushed branch and
   never force-push** to make the graph linear. On a conflict, stop and report.
3. **One phase, one branch.** `feat/<phase>-<slug>` carries every feature of that phase —
   F3.1 through F3.12 all land on `feat/03-google-auth`. Never open a second branch mid-phase,
   never reuse a branch after its phase is done.
4. **Test before every push.** `pnpm typecheck && pnpm lint && pnpm test`, plus
   `pnpm test:e2e` when the feature touches sign-in, a lesson or an exam, plus the phase's
   exit gate. A failing gate means **do not push** — report the failure instead.
   > **PAUSED per section 0 (2026-08-19).** While the build-mode block stands the pre-push
   > gate is **`pnpm typecheck && pnpm lint` only**. `pnpm test`, `pnpm test:e2e` and the
   > phase exit gate are not run and do not block a push. A failing typecheck or lint still
   > blocks — nothing ships that does not compile.
5. **Never force-push.** Not `--force`, not `-f`, not `--force-with-lease` on a shared branch.
6. **Never delete a branch.** Not `main`, not `dev`, not a merged feature branch, not a stale
   one. No `git branch -D`, no `git push origin --delete`. Cleanup is a human decision.
7. **Never `--no-verify`.** It skips the hooks that run the gate.
8. **Never commit a secret.** Check `git diff --staged` before every commit.

If you find yourself on `main`: stop, stash, `git checkout dev && git pull`, branch, pop,
and tell the user it happened.

---

## 6. One feature at a time — the working rhythm

`PROGRESS.md` is the live state of the build. It is the file that answers "what next".
Full rules are at the top of it; these are the ones you may never break:

1. **Work on exactly one feature at a time.** Find the first `[ ]` in the topmost unfinished
   phase of `PROGRESS.md`, mark it `[~]`, and build only that. There is never more than one
   `[~]` in the file. `/build` finishes a **whole phase** per invocation, but strictly in
   sequence: the next feature is picked only after the previous is `[x]`, committed, pushed
   and merged — never in parallel, never in advance.
   A feature blocked on a phase that has not happened yet is `[-]` with the reason and the id
   it re-opens under, never `[~]`. `[~]` means in flight, and a stale one blocks every run.
2. **Never start a second feature** because the current one is awkward, blocked in your head,
   or "mostly done". Mostly done is not done.
> **SUSPENDED 2026-08-19 by the user — rules 3, 4, 5 and 6 below are not enforced.**
> They stay in the file as the standard to restore. Do not delete them. While this note stands:
> a feature ships without tests; a missing or failing test never makes a feature `[!]`; nothing
> here requires a green suite before `[x]`.
> **Two things survive the suspension, because nothing else covers them:**
> - The `[x]` bookkeeping from rule 6 — a feature is `[x]` when it is **built and merged into
>   `dev`**; then add the date, add a **Log** line, and move the **NEXT** pointer.
> - The "never fake it" half of rule 5 — a test that *is* written and *is* red must not be
>   deleted, `.skip`ped, weakened, or silenced with an `eslint-disable` to go green. Report it.
>
> Rules 1, 2 and 7 are untouched and still live.

3. *(suspended)* **Every feature ships with tests.** Each feature in `PROGRESS.md` lists its test cases.
   Write them, run them, paste the output.
4. *(suspended)* **If a test fails: it becomes `[!]`, and it is now the only thing you work on.** Debug it,
   find the actual cause, fix it, re-run. Do not move on. Do not park it. Do not "come back
   to it later". The **Blocked / failed** table in `PROGRESS.md` must be empty before any new
   feature starts.
5. *(suspended, except the clause named above)* **Never fake a pass.** No deleting a test, no skipping it, no `.skip`, no loosening an
   assertion, no disabling a lint rule to go green. A red test is information; a deleted red
   test is a lie.
6. *(suspended, except the bookkeeping named above)* **Mark `[x]` only when** it is built **and** its tests are green **and** it is merged into
   `dev`. Then add the date, add a line to the **Log**, and move the **NEXT** pointer.
7. **Never leave a feature incomplete at the end of a session.** If you genuinely cannot
   finish, leave it `[~]` with a written note of exactly where it stands and what remains —
   never silently.

---

## 7. Working boundaries — how you must operate

1. **Build in phase order.** `BUILD-ORDER-COMPLETE.md` is the contract. Do not start
   phase N+1 while phase N has an unmet exit gate, and do not start feature N+1 while
   feature N is not `[x]` in `PROGRESS.md`.
   > **PARTLY PAUSED per section 0.** Phase **order** still holds absolutely — phases run
   > 4, 5, 6, 7, 8, never out of sequence. The **exit gate** precondition is paused: an
   > ungated phase no longer blocks the next one. Feature order inside a phase still holds.
2. **One feature at a time; one phase per session.** Finish the feature, test it, mark it,
   then take the next. At the end of the phase run its exit gate, report, stop.
   Do not silently roll into the next phase.
   > **PAUSED per section 0.** One feature at a time still holds. "One phase per session"
   > is replaced by **five phases per `/build`**, and rolling into the next phase is now
   > the expected behaviour, not a violation — up to the five-phase limit.
3. **Never scaffold ahead.** No placeholder modules "for later", no `// TODO: implement
   in phase 7` stubs outside the current phase's scope.
4. **Never fake green.** If a test fails, show the failure. If a gate cannot pass, say so
   and say why. Do not delete, skip, or weaken a test to make a gate pass.
   > **PARTLY PAUSED per section 0.** Gates are not run, so there is no gate to fake. The
   > honesty half is **not** paused: never claim a feature works when it does not, never
   > report a phase complete when features are missing, and if an existing test goes red,
   > say so plainly rather than removing it.
5. **Never weaken a rule to unblock yourself.** Not the lint boundaries, not `strict`,
   not the coverage floor, not RLS. If a rule genuinely blocks correct work, stop and
   raise it.
6. **No invented content.** If you cannot produce authentic IPA, Bangla, or a real
   linguistic fact, mark it `ipaNeedsReview: true` / `needsReview: true` and report the
   list. Never guess and present it as data.
7. **Prove, don't claim.** A phase that says "prove it" wants the command and its
   output pasted back, not a sentence saying it works.
8. **Ask before deviating.** A decision the spec did not cover: make it, and record it in
   `ARCHITECTURE.md` under "decisions I made that were not specified". A decision that
   contradicts the spec: stop and ask.

---

## 8. Documentation map

| Doc | Read it when |
| --- | --- |
| [`PROGRESS.md`](PROGRESS.md) | **Every session, first** — it names the features you work on, in order |
| [`docs/00-overview.md`](.claude/docs/00-overview.md) | Always, once, first |
| [`docs/01-architecture.md`](.claude/docs/01-architecture.md) | Any backend work |
| [`docs/02-typescript-rules.md`](.claude/docs/02-typescript-rules.md) | Any code at all |
| [`docs/03-database.md`](.claude/docs/03-database.md) | Phase 2, 5 |
| [`docs/04-authentication.md`](.claude/docs/04-authentication.md) | Phase 3 |
| [`docs/05-domain-model.md`](.claude/docs/05-domain-model.md) | Phase 2, 4, 5 |
| [`docs/06-spaced-repetition.md`](.claude/docs/06-spaced-repetition.md) | Phase 4 |
| [`docs/07-speech-scoring.md`](.claude/docs/07-speech-scoring.md) | Phase 6 |
| [`docs/08-exam-engine.md`](.claude/docs/08-exam-engine.md) | Phase 7, 12 |
| [`docs/09-notifications.md`](.claude/docs/09-notifications.md) | Phase 8 |
| [`docs/10-content-pipeline.md`](.claude/docs/10-content-pipeline.md) | Phase 9 |
| [`docs/11-api-surface.md`](.claude/docs/11-api-surface.md) | Phase 1, 5, 7, 8 |
| [`docs/12-design-system.md`](.claude/docs/12-design-system.md) | Phase 1, 10, 11, 12 |
| [`docs/13-frontend.md`](.claude/docs/13-frontend.md) | Phase 10, 11, 12 |
| [`docs/14-quality-gates.md`](.claude/docs/14-quality-gates.md) | Every phase exit |
| [`docs/16-environment.md`](.claude/docs/16-environment.md) | Phase 1, 7, 8, 13 — and any new env var |
| [`docs/15-git-workflow.md`](.claude/docs/15-git-workflow.md) | Every commit and push |

`ARCHITECTURE.md` (written in Phase 0) is a living record — update it when a decision changes.

---

## 9. Commands

```bash
pnpm dev            # the app — UI and API together
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm content:seed   # validate + diff + apply course content
pnpm setup:check    # node version, dependencies, env file present
```

**`/build` is the single entry point.** It runs preflight → picks the one next feature →
branches → builds → tests → fixes any failure → marks it `[x]` → commits and pushes → stops.
Run it again for the next feature.

Other commands in `.claude/commands/`: `/next-feature`, `/phase-start`, `/phase-check`,
`/ship`, `/layer-audit`, `/type-audit`, `/exam-attack`, `/content-gap`.

---

## 10. Standing prohibitions

- No `type` on object literals. No `enum`. No `any`. No `as`. No `!`.
- No separate backend project. No NestJS, no Express, no second deploy target.
- No ORM. No Prisma. No repository that returns a raw Supabase row past infrastructure.
- No business logic in a route handler, a React component, or a Postgres trigger that a
  domain service should own.
- No `process.env` outside `src/lib/env.ts`. No secret in a `NEXT_PUBLIC_*` variable.
- **No reading, printing, editing or writing `.env`, `.env.local` or any `.env.*` file — ever.**
  `ls -la .env .env.local` to check existence is the only permitted interaction.
- No stalling the whole build on the env check. Run it once, then work.
- No Server Component fetching its own API over HTTP.
- No client-trusted identity, score, deadline, or attempt count.
- No `correct_answer` in any exam response before submission.
- No emoji, gradient, illustration, or shadow (except overlays) in the UI.
- No transliterated "Bangla". Real Bangla script only.
- No commit, push or merge to `main`. No force-push. No branch deletion. No `--no-verify`.
- No push with a failing typecheck, lint, test or phase gate.
  *(Paused per section 0 → **typecheck and lint only**; test and gate do not block a push.)*
- No second feature started while one is `[~]` or `[!]` in `PROGRESS.md`.
- No `[x]` without written, passing tests. No skipped, deleted or weakened test to get there.
  *(Paused per section 0 → `[x]` = **built and merged into `dev`**. The second sentence still
  stands for tests that already exist: never skip, delete or weaken one.)*
- No feature left incomplete.
