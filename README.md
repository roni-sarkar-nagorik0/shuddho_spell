# ShuddhoSpell

A 28-day English precision-training program for Bengali (Bangla) speakers — spelling,
pronunciation and sentence construction, diagnosed per phoneme and per rule family.

**One Next.js 15 app** — UI and API in the same project. TypeScript (interface-first) ·
Supabase · Clean Architecture · Google-only auth.

> **Phases 0–13 are built.** Every feature in [`PROGRESS.md`](PROGRESS.md) is `[x]`, and that
> file remains the live state. What is **built** and what is **proved** are not the same thing
> here, and the difference is written down rather than glossed: see
> [`DECISIONS.md`](DECISIONS.md) and the closing report at the end of `PROGRESS.md` for the
> exact list of what has never been run — Lighthouse, the four Playwright flows, the RLS
> two-user check, the CI and deploy workflows, and the app itself in a browser.

## Working on this project with Claude Code

1. Claude reads [`CLAUDE.md`](CLAUDE.md) automatically at the start of every session —
   the stack, the rules checklist, and the operating boundaries.
2. [`PROGRESS.md`](PROGRESS.md) is the live tracker: every feature, one checkbox each, with
   its test cases. It answers "what next" — **one feature at a time**.
3. [`BUILD-ORDER-COMPLETE.md`](BUILD-ORDER-COMPLETE.md) is the build contract: 14 phases,
   each with deliverables, an exit gate, and a status you flip only when the gate really passes.
4. [`.claude/docs/`](.claude/docs/README.md) holds the detailed feature specifications.

### The only command you need

```
/build
```

That is it. Run it, and Claude:

1. checks an env file exists (`.env` or `.env.local`) — notes it once, never blocks twice
2. reads the rules and the docs for the current phase
3. picks the **one** next feature from `PROGRESS.md` (a failed `[!]` one first, if any)
4. cuts the phase branch from `dev`
5. builds only that feature
6. writes and runs its tests
7. if anything fails: marks it `[!]`, debugs, fixes, re-runs — starts nothing else
8. marks it `[x]`, logs it, commits and pushes the feature branch
9. **stops** and tells you what's next

Run `/build` again for the next feature. Repeat until the program is finished.

### Other commands

| Command | Use |
| --- | --- |
| `/next-feature` | same loop, without the branch and ship steps |
| `/phase-start` | set up a whole phase at once |
| `/phase-check` | run the current phase's exit gate |
| `/ship` | test, commit, push, PR into `dev` |
| `/layer-audit` | find and fix Clean Architecture violations by adding ports |
| `/type-audit` | convert illegitimate `type` aliases to interfaces |
| `/exam-attack` | attack the exam engine's server authority |
| `/content-gap` | fill thin course content one week at a time |

### If you start a fresh session mid-build

Just run `/build` — it re-reads everything and picks up exactly where `PROGRESS.md` left off.

## The working rhythm

**One feature at a time.** `PROGRESS.md` holds every feature with a checkbox and its test cases:

| Mark | Meaning |
| --- | --- |
| `[ ]` | not started |
| `[~]` | in progress — only ever one in the whole file |
| `[x]` | built, tested, green, merged into `dev` |
| `[!]` | failed — blocks everything until it is fixed |

The loop: pick the next `[ ]` → build only that → write and run its tests → **if it fails,
debug and fix it before touching anything else** → mark `[x]` → move the NEXT pointer → stop.

Nothing is marked `[x]` without passing tests, and no feature is ever left incomplete.

## Git rules

```
main   ← protected. Never committed to, never pushed to, never merged into by Claude.
         Reaches production via a human-merged PR from dev.
dev    ← integration branch. Feature work lands here via PR.
feat/… ← one branch per feature (one phase = one feature).
```

- Never touch `main`. Never force-push. Never delete a branch.
- Every feature gets its own branch, cut from an up-to-date `dev`.
- Nothing is pushed until `typecheck`, `lint`, `test` (and `e2e` where relevant) are green
  **and** the phase's exit gate is fully checked.

Full rules: [`.claude/docs/15-git-workflow.md`](.claude/docs/15-git-workflow.md).
`.claude/settings.json` additionally denies force-push, branch deletion, `--no-verify`,
`git reset --hard` and pushes to `main` at the tool level.

## Getting started — from a clean checkout

**No Docker. No local database.** This app talks to a hosted Supabase project in development
exactly as it does in production, so there is nothing to boot on your machine.

### 1. Prerequisites

- Node 20.11 or newer
- pnpm 10 (`corepack enable pnpm`)
- A Supabase project — free tier is enough. **Use a separate project for development**,
  never the production one.

### 2. Install

```bash
pnpm install
```

### 3. Create your env file

```bash
cp .env.example .env.local
```

Fill in **sections 1 and 2 only** — the rest is documented per phase and not needed yet:

| Variable | Where to get it |
| --- | --- |
| `NODE_ENV` | `development` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page → Project API keys → `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → Project API keys → `service_role` |
| `DATABASE_URL` | Project Settings → Database → Connection string → URI |

`SUPABASE_SERVICE_ROLE_KEY` bypasses every RLS policy. Server-only, never logged, never
imported into a Client Component.

**Claude checks once that an env file exists** (`.env` or `.env.local`) and then gets on with
the build. It never reads, prints or edits that file — existence only. Every variable is
validated by Zod at boot, and a missing one stops the app and names itself.

### 4. Check the setup

```bash
pnpm setup:check
```

Node version, dependencies, env file present. It reads nothing out of your env file.

### 5. Apply the database schema

```bash
pnpm db:migrate
```

Plain SQL from `supabase/migrations/`, applied over `DATABASE_URL` in order. No Docker, no
Supabase CLI. The runner keeps a ledger in `public.schema_migrations`, so it is safe to run
again — already-applied files are skipped, and an *edited* one is refused: migrations are
forward-only, so you add a new numbered file rather than changing a shipped one.

`pnpm db:migrate:dry` lists what is pending without opening a connection.

If `001` prints `pg_cron not enabled`, that is expected on plans that cannot install it —
nothing before Phase 7 needs it. Enable it in Supabase → Database → Extensions when you
get there.

### 6. Run it

```bash
pnpm dev
```

| URL | Expect |
| --- | --- |
| http://localhost:3000 | the landing page, in English and Bangla |
| http://localhost:3000/api/health | `{"data":{"status":"ok"},…}` |
| http://localhost:3000/api/ready | `"database":"up"` once your Supabase values are real — `"down"` until the Phase 2 schema exists |

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Invalid public environment. Check these in .env.local: …` | that variable is missing or malformed — the message names it |
| `/api/ready` reports `"database":"down"` | wrong Supabase URL or key, or the Phase 2 schema has not been applied yet |
| `pnpm db:migrate` fails with `ENOTFOUND db.<ref>.supabase.co` | that is the direct host, which Supabase serves over IPv6 only. Use the **Session pooler** URI from Project Settings → Database as `DATABASE_URL` |
| port 3000 is taken | `PORT=3311 pnpm dev` |

## Repository layout

```
src/
  app/                   App Router — pages AND api route handlers
    api/v1/…/route.ts    three-line re-exports of module handlers
    api/cron/…           scheduled jobs, guarded by CRON_SECRET
  modules/<feature>/     domain · application · infrastructure · presentation
  contracts/             interfaces + Zod schemas, shared server and client
  composition/           the composition root — ports wired to implementations
  components/            design system + feature components
  lib/                   env, supabase clients, logger, withApi wrapper, i18n
supabase/migrations/     plain SQL, numbered, forward-only
content/                 typed course content, one file per week
.claude/docs/            feature specifications
```

There is **no separate backend project**. One `package.json`, one build, one deploy.

## Commands

```bash
pnpm dev              # UI and API together
pnpm build
pnpm typecheck
pnpm lint
pnpm test             # Vitest — unit, integration, component
pnpm test:e2e         # Playwright
pnpm setup:check      # node version, dependencies, env file present
pnpm db:migrate       # apply supabase/migrations over DATABASE_URL
```

## Where the honest picture is

Three files, and they say different things on purpose:

| File | What it is |
| --- | --- |
| [`PROGRESS.md`](PROGRESS.md) | every feature, its date, and — at the end — the closing report naming what is incomplete and what is fragile |
| [`DECISIONS.md`](DECISIONS.md) | the twelve decisions that shape the system, with what each one costs |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | the full record: 67 numbered decisions, the layer diagram, the port table, and the open items nobody has resolved |

## Verification that has not been run

Written down here because a README that implies otherwise is the most-read lie in a
repository:

- **Lighthouse** on `/` — the ≥95/100 target in `13-frontend.md` is unmeasured. Static
  rendering is additionally blocked by the root layout's cookie reads (ARCHITECTURE.md D67).
- **The four Playwright flows** and **`pnpm security:rls`** — written, never executed. They
  need a live Supabase project and two seeded learners.
- **The CI and deploy workflows** — their YAML parses; no runner has ever run them. The deploy
  workflow's publish step is deliberately absent (ARCHITECTURE.md O4).
- **Coverage** — 57.20% lines against a 90% floor. Reported on every CI run, not gated.
- **The application in a browser** — Phases 10 through 12 are typecheck- and lint-clean and
  have not been rendered.

`pnpm typecheck`, `pnpm lint` and `pnpm test` (553 tests) are green, and those have been run.
