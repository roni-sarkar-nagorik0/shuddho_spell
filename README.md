# ShuddhoSpell

A 28-day English precision-training program for Bengali (Bangla) speakers — spelling,
pronunciation and sentence construction, diagnosed per phoneme and per rule family.

**One Next.js 15 app** — UI and API in the same project. TypeScript (interface-first) ·
Supabase · Clean Architecture · Google-only auth.

> **Phase 1 is in progress.** The app scaffold boots; the database schema is Phase 2.
> [`PROGRESS.md`](PROGRESS.md) is the live state.

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

### 5. Run it

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
| port 3000 is taken | `PORT=3311 pnpm dev` |

## Repository layout (once built)

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

## Commands (once built)

```bash
pnpm dev              # UI and API together
pnpm build
pnpm typecheck
pnpm lint
pnpm test             # Vitest — unit, integration, component
pnpm test:e2e         # Playwright
pnpm setup:check      # node version, dependencies, env file present
```
