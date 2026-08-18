# CLAUDE.md — ShuddhoSpell

Read this file at the start of **every** session, before writing a single line of code.
Then read **`PROGRESS.md`** — it tells you the one feature you are allowed to work on next —
and `BUILD-ORDER-COMPLETE.md` for that phase's gate, and the `.claude/docs/` files it points at.

---

## 1. What this project is

ShuddhoSpell is a production web application: a **28-day English precision-training
program for Bengali (Bangla) speakers** who misspell words, mispronounce them, and
cannot construct correct sentences.

Three engines carry the product: spaced repetition, pronunciation scoring, and a
server-authoritative exam engine. Everything else is delivery.

Full product detail: [`.claude/docs/00-overview.md`](.claude/docs/00-overview.md)

---

## 2. Stack — non-negotiable

| Concern | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| API | NestJS 10, TypeScript strict, REST, OpenAPI via `@nestjs/swagger` |
| Web | Next.js 15 App Router, React 19, Tailwind, TanStack Query |
| Shared | `packages/contracts` (interfaces + Zod), `packages/config` (tsconfig/eslint/prettier) |
| DB / Auth / Storage | Supabase (Postgres 15, Supabase Auth, Supabase Storage) |
| Migrations | Plain SQL in `supabase/migrations`. No ORM. No Prisma. |
| Runtime | Node 20 LTS, pnpm |
| Tests | Jest + supertest (api), Vitest + Testing Library (web), Playwright (e2e) |

Do not add a dependency that replaces one of these. Do not introduce an ORM, a
second state library, a component library, or a CSS-in-JS runtime.

---

## 3. The rules checklist — re-read this every session

### Architecture
- [ ] Four layers per feature module: `domain/`, `application/`, `infrastructure/`, `presentation/`.
- [ ] Dependency rule: `domain` → nothing. `application` → domain. `infrastructure` → domain + application. `presentation` → application + contracts.
- [ ] A violation must fail **lint** (`eslint-plugin-boundaries`), not review. Never loosen the rule to make an import pass — introduce the missing port instead.
- [ ] Every port has a `Symbol` token declared beside its interface. Use cases inject via the token, never the concrete class.
- [ ] One use case per class, one public `execute(input): Promise<output>` method, with its own `IXInput` / `IXOutput` interfaces.
- [ ] A use case never receives a `Request`, a `Response`, a Supabase client, or a raw DB row.
- [ ] Controllers are thin: parse with Zod → call exactly one use case → map to contract → return. Business logic in a controller is a bug.

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
- [ ] The API never performs the OAuth dance — it only verifies the Supabase JWT (RS256, JWKS, `iss`/`aud`/`exp`).
- [ ] Identity always comes from the verified token, never from the client body.
- [ ] Routes are protected by default (`APP_GUARD`), public by exception (`@Public()`).
- [ ] RLS is on for every learner table and written as if the API did not exist.

### Quality
- [ ] Env vars validated with Zod at boot; the app refuses to start and names the offending var.
- [ ] Every use case has a unit test with in-memory fakes and a `FakeClock` — no Nest `TestingModule`.
- [ ] Coverage floor 90% on `domain` and `application`.
- [ ] No secret in code, ever, and none in the client bundle.

Detail and rationale: [`.claude/docs/01-architecture.md`](.claude/docs/01-architecture.md) and
[`.claude/docs/02-typescript-rules.md`](.claude/docs/02-typescript-rules.md).

---

## 4. Git rules — absolute, no exceptions

Full detail: [`.claude/docs/15-git-workflow.md`](.claude/docs/15-git-workflow.md)

```
main   ← protected. Never commit, never push, never merge into it. Human-merged PR from dev only.
dev    ← integration branch. Feature work lands here via PR.
feat/… ← one branch per feature. Where you work.
```

1. **Never touch `main`.** No commit, no push, no merge, no force-push, no rebase onto it.
   Not for a hotfix, not for a typo. If something must reach `main`, say so and stop —
   a human merges the `dev` → `main` PR.
2. **Always work on a feature branch, always push to `dev` through it.**
   `feat/<phase>-<slug>`, branched from an up-to-date `dev`, never from `main`.
3. **One feature, one branch.** A phase in `BUILD-ORDER-COMPLETE.md` is one feature.
   Never stack two features on one branch, never reuse a merged branch.
4. **Test before every push.** `pnpm typecheck && pnpm lint && pnpm test`, plus
   `pnpm test:e2e` when the feature touches sign-in, a lesson or an exam, plus the phase's
   exit gate. A failing gate means **do not push** — report the failure instead.
5. **Never force-push.** Not `--force`, not `-f`, not `--force-with-lease` on a shared branch.
6. **Never delete a branch.** Not `main`, not `dev`, not a merged feature branch, not a stale
   one. No `git branch -D`, no `git push origin --delete`. Cleanup is a human decision.
7. **Never `--no-verify`.** It skips the hooks that run the gate.
8. **Never commit a secret.** Check `git diff --staged` before every commit.

If you find yourself on `main`: stop, stash, `git checkout dev && git pull`, branch, pop,
and tell the user it happened.

---

## 5. One feature at a time — the working rhythm

`PROGRESS.md` is the live state of the build. It is the file that answers "what next".
Full rules are at the top of it; these are the ones you may never break:

1. **Work on exactly one feature.** Find the first `[ ]` in the topmost unfinished phase of
   `PROGRESS.md`, mark it `[~]`, and build only that. There is never more than one `[~]` in
   the file.
2. **Never start a second feature** because the current one is awkward, blocked in your head,
   or "mostly done". Mostly done is not done.
3. **Every feature ships with tests.** Each feature in `PROGRESS.md` lists its test cases.
   Write them, run them, paste the output.
4. **If a test fails: it becomes `[!]`, and it is now the only thing you work on.** Debug it,
   find the actual cause, fix it, re-run. Do not move on. Do not park it. Do not "come back
   to it later". The **Blocked / failed** table in `PROGRESS.md` must be empty before any new
   feature starts.
5. **Never fake a pass.** No deleting a test, no skipping it, no `.skip`, no loosening an
   assertion, no disabling a lint rule to go green. A red test is information; a deleted red
   test is a lie.
6. **Mark `[x]` only when** it is built **and** its tests are green **and** it is merged into
   `dev`. Then add the date, add a line to the **Log**, and move the **NEXT** pointer.
7. **Never leave a feature incomplete at the end of a session.** If you genuinely cannot
   finish, leave it `[~]` with a written note of exactly where it stands and what remains —
   never silently.

---

## 6. Working boundaries — how you must operate

1. **Build in phase order.** `BUILD-ORDER-COMPLETE.md` is the contract. Do not start
   phase N+1 while phase N has an unmet exit gate, and do not start feature N+1 while
   feature N is not `[x]` in `PROGRESS.md`.
2. **One feature at a time; one phase per session.** Finish the feature, test it, mark it,
   then take the next. At the end of the phase run its exit gate, report, stop.
   Do not silently roll into the next phase.
3. **Never scaffold ahead.** No placeholder modules "for later", no `// TODO: implement
   in phase 7` stubs outside the current phase's scope.
4. **Never fake green.** If a test fails, show the failure. If a gate cannot pass, say so
   and say why. Do not delete, skip, or weaken a test to make a gate pass.
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

## 7. Documentation map

| Doc | Read it when |
| --- | --- |
| [`PROGRESS.md`](PROGRESS.md) | **Every session, first** — it names the one feature you may work on |
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
| [`docs/15-git-workflow.md`](.claude/docs/15-git-workflow.md) | Every commit and push |

`ARCHITECTURE.md` (written in Phase 0) is a living record — update it when a decision changes.

---

## 8. Commands

```bash
pnpm dev            # all apps
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm content:seed   # validate + diff + apply course content
pnpm db:reset       # local Supabase reset + migrate + seed
```

Slash commands in `.claude/commands/`: `/next-feature`, `/phase-start`, `/phase-check`, `/ship`,
`/layer-audit`, `/type-audit`, `/exam-attack`, `/content-gap`.

---

## 9. Standing prohibitions

- No `type` on object literals. No `enum`. No `any`. No `as`. No `!`.
- No ORM. No Prisma. No repository that returns a raw Supabase row past infrastructure.
- No business logic in a controller, a React component, or a Postgres trigger that a
  domain service should own.
- No client-trusted identity, score, deadline, or attempt count.
- No `correct_answer` in any exam response before submission.
- No emoji, gradient, illustration, or shadow (except overlays) in the UI.
- No transliterated "Bangla". Real Bangla script only.
- No commit, push or merge to `main`. No force-push. No branch deletion. No `--no-verify`.
- No push with a failing typecheck, lint, test or phase gate.
- No second feature started while one is `[~]` or `[!]` in `PROGRESS.md`.
- No `[x]` without written, passing tests. No skipped, deleted or weakened test to get there.
- No feature left incomplete.
