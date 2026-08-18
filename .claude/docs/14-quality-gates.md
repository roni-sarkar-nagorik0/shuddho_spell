# 14 — Quality gates

Gates are **wired up**, not mentioned. A gate that is documented but not enforced is a lie in
a markdown file.

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
| `domain` | pure unit tests | **90%** |
| `application` | unit tests with in-memory fakes + `FakeClock` | **90%** |
| `infrastructure` | integration tests against a real local Supabase | covered by integration |
| `presentation` | e2e / supertest | covered by integration |

- Every use case has a unit test with in-memory fake repositories and **no Nest
  `TestingModule`**. If a use case needs Nest to be tested, its dependencies are wrong.
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

## Hooks and CI

- Husky + lint-staged on commit.
- GitHub Actions: `typecheck` → `lint` → `unit` → `integration` (Supabase service container)
  → `e2e` → `build`.
- Migrations run as a **gated** deployment step, never automatically on push.

## Secrets and env

- No secret in code. Ever.
- Env vars validated at boot with Zod. The app **refuses to start** on a missing or malformed
  var and prints exactly which one.
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

Structured logs with request ids (pino), Sentry on both apps, and a `/metrics` endpoint.

## The honest closing report

Phase 13 ends with a written list of **what is incomplete, what is fragile, and what to
build next**. Not a victory lap. That list is the most valuable artefact of the whole build.
