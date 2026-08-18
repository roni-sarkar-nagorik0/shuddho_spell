# ShuddhoSpell

A 28-day English precision-training program for Bengali (Bangla) speakers — spelling,
pronunciation and sentence construction, diagnosed per phoneme and per rule family.

NestJS · Next.js 15 · TypeScript (interface-first) · Supabase · Clean Architecture ·
Google-only auth.

> **The build has not started yet.** This repository currently contains the Claude Code
> setup only. Begin at Phase 0 in [`BUILD-ORDER-COMPLETE.md`](BUILD-ORDER-COMPLETE.md).

## Working on this project with Claude Code

1. Claude reads [`CLAUDE.md`](CLAUDE.md) automatically at the start of every session —
   the stack, the rules checklist, and the operating boundaries.
2. [`PROGRESS.md`](PROGRESS.md) is the live tracker: every feature, one checkbox each, with
   its test cases. It answers "what next" — **one feature at a time**.
3. [`BUILD-ORDER-COMPLETE.md`](BUILD-ORDER-COMPLETE.md) is the build contract: 14 phases,
   each with deliverables, an exit gate, and a status you flip only when the gate really passes.
4. [`.claude/docs/`](.claude/docs/README.md) holds the detailed feature specifications.

### Building the next feature

```
/next-feature
```

Claude finds the single next `[ ]` in `PROGRESS.md`, marks it `[~]`, builds only that, writes
and runs its tests, fixes any failure before moving on, then marks it `[x]` and stops.

If anything is `[!]` (failed), `/next-feature` works on **that** instead — nothing else starts
until it is green.

### Starting a phase

```
/phase-start
```

Reads the rules, finds the first unfinished phase, cuts its branch from `dev`, and works its
features one at a time.

### Finishing a session

```
/phase-check
```

Runs the phase's exit gate, pastes real output, and flips the status only if everything passed.

### Shipping a phase

```
/ship
```

Runs the gate, then commits and pushes the **feature branch** and opens a PR into `dev`.
It refuses to run on `main` or `dev`, and refuses to push on a red gate.

### Other commands

| Command | Use |
| --- | --- |
| `/layer-audit` | find and fix Clean Architecture violations by adding ports |
| `/type-audit` | convert illegitimate `type` aliases to interfaces |
| `/exam-attack` | attack the exam engine's server authority |
| `/content-gap` | fill thin course content one week at a time |

### If you start a fresh session mid-build

```
Read CLAUDE.md and BUILD-ORDER-COMPLETE.md, then continue.
```

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

## Repository layout (once built)

```
apps/api                 NestJS — four layers per feature module
apps/web                 Next.js 15 App Router
packages/contracts       shared interfaces + Zod schemas (single source of truth)
packages/config          shared tsconfig, eslint, prettier
supabase/migrations      plain SQL, numbered, forward-only
content/                 typed course content, one file per week
.claude/docs             feature specifications
```

## Commands (once built)

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm content:seed
pnpm db:reset
```
