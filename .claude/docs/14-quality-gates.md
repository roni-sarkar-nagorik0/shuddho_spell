# 14 — Quality gates

Gates are **wired up**, not mentioned. A gate that is documented but not enforced is a lie in
a markdown file.

> **PAUSED 2026-08-19 by the user — feature-first build mode. Section 0 of `CLAUDE.md` governs.**
> The **Tests** section below (Vitest, Playwright, the 90% `domain` / `application` coverage
> floor) and every phase exit gate are **not enforced** right now. Nothing here has been
> deleted: this document stays the specification of what "done properly" means, and it is what
> gets re-enforced when the pause is lifted.
>
> **The Lint and Types sections are NOT paused.** `pnpm typecheck && pnpm lint` runs before
> every push, `eslint-plugin-boundaries` still fails a layer violation, and the rule against
> disabling a rule to unblock work stands exactly as written.

## Lint

- `eslint-plugin-boundaries` enforcing the four-layer dependency rule.
- `eslint-plugin-import` with `no-cycle`.
- `typescript-eslint` **strict-type-checked**.
- A custom rule (or a boundaries rule) banning `type` for object literal shapes.

Prove both the boundary rule and the `type` rule by deliberately breaking them, pasting the
error, then reverting. That proof is a Phase 1 exit item and is re-run any time the config
changes.

**Never disable a rule to unblock work.** Not with `eslint-disable`, not by loosening the
config, not by moving a file. If a rule genuinely blocks correct code, stop and raise it.

## Types

Every strict flag on (`02-typescript-rules.md`). `pnpm typecheck` clean is a precondition for
every phase exit.

## Tests

| Layer | Approach | Floor |
| --- | --- | --- |
| `domain` | pure unit tests (Vitest) | **90%** |
| `application` | unit tests with in-memory fakes + `FakeClock` | **90%** |
| `infrastructure` | integration tests against a real local Supabase | covered by integration |
| `presentation` | route handlers invoked directly with a `Request` | covered by integration |
| UI | Vitest + Testing Library | covered by component + e2e |

One test runner: **Vitest** for unit, integration and component tests; **Playwright** for e2e.
Route handlers are tested by calling the exported `GET`/`POST` with a constructed `Request` —
no HTTP server, no supertest.

- Every use case has a unit test constructed directly: `new SomeUseCase(fakeRepo, fakeClock)`.
  No framework, no container, no module loader. If a use case needs more than that to be
  tested, its dependencies are wrong.
- Integration suites seed and tear down per suite. No shared mutable fixture.
- Playwright covers the four flows that must never break:
  1. Google sign-in → dashboard
  2. a complete day-12 lesson
  3. a full `milestone2` exam **including a mid-exam refresh**
  4. a failed exam producing its drill prescription

**Never delete, skip or weaken a test to make a gate pass.** Report the failure instead.

## The pre-push gate

Nothing is pushed until `pnpm typecheck`, `pnpm lint`, `pnpm test` (and `pnpm test:e2e` where
the feature touches sign-in, a lesson or an exam) are green on real output, and the phase's
exit gate is fully checked. Work happens on a feature branch off `dev`; `main` is never
touched. Full rules: `15-git-workflow.md`.

## Content and i18n gates

Two gates the original list did not have, both wired into `prebuild` so they run before every
build rather than when somebody remembers:

- `pnpm content:validate` — the whole corpus through Zod, naming the file and the entry. See
  `10-content-pipeline.md`.
- `pnpm i18n:check` — fails on any key present in `en` and missing in `bn`.

## Hooks and CI

**There is no Husky and no lint-staged.** The pre-push gate is the discipline in
`15-git-workflow.md` plus CI, and a commit hook that runs a subset of it mostly teaches people
to pass `--no-verify`. If hooks are added, they run the same commands, not weaker ones.

`.github/workflows/ci.yml` — two jobs, not a six-step chain:

| Job | Steps | When |
| --- | --- | --- |
| `verify` | install → typecheck → lint → content and i18n gates → unit and integration tests → coverage → build | every push and PR |
| `e2e` | install → browsers → the four Playwright flows → the two-user RLS check | pushes to `dev` only |

One app, one build job. `e2e` is branch-gated because it needs credentials a fork's PR does
not have, and a job that cannot run is worse than one that does not.

`.github/workflows/deploy.yml` — `migrate` then `release`, both checking that their secrets
are configured **before** spending three minutes discovering it. Migrations run as a **gated**
step, never automatically on push, and `migrate` shows what it would apply before applying it.

## Secrets and env

- No secret in code. Ever.
- Env vars validated at boot with Zod (`src/lib/env.public.ts`, `src/lib/env.server.ts`). The
  app **refuses to start** on a missing or malformed var and prints exactly which one. See
  `16-environment.md`.
- `.env.example` is complete and committed; `.env.local` never is.
- The server env module is `server-only`, so importing a secret into a Client Component is a
  build failure rather than a runtime leak.
- Phase 13 verifies no secret reaches the client bundle.

## Security pass (Phase 13)

- RLS re-verified with the two-user script from Phase 2.
- The `correct_answer` snapshot test re-run across every exam response.
- Rate limits confirmed on every write route.
- Security headers and a CSP.
- No secret in the client bundle.

## Performance pass (Phase 13)

- Index review against the queries that actually run.
- N+1 audit **with query counting**, not by inspection. `GetLearnerDashboard` has a test that
  asserts the query count.
- **p95 ≤ 200ms** on read routes.
- A bundle budget on the web app, enforced in CI.

## Observability

Structured logs with request ids (pino), Sentry wired through `src/instrumentation.ts`, and
`/api/metrics` — behind `withCron`'s bearer secret, because request counts and timings are
operational data, not a public page.

## The honest closing report

Phase 13 ends with a written list of **what is incomplete, what is fragile, and what to
build next**. Not a victory lap. That list is the most valuable artefact of the whole build.
