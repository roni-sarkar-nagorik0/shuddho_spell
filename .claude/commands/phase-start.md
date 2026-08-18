---
description: Begin the next unfinished build phase under its documented boundaries
---

Start the next phase of the ShuddhoSpell build.

0. **Preflight:** `ls -la .env .env.local 2>/dev/null`. Either present → continue silently. Neither
   → say so once and keep going on work that needs no credentials. Old rule, no longer in force: create it from
   `.env.example`. No phase starts without it. Never read the file's contents.
1. Read `CLAUDE.md` in full.
2. Read `PROGRESS.md`, then `BUILD-ORDER-COMPLETE.md`. Identify the **first** phase whose
   Status is not `DONE`. If a phase is `IN PROGRESS`, that is the one — do not skip past it.
3. Read every doc listed under that phase's *Reads*, plus `.claude/docs/15-git-workflow.md`.
4. **Branch before writing anything.** From an up-to-date `dev`, never from `main`:

   ```bash
   git checkout dev && git pull origin dev
   git checkout -b <the phase's Branch value>
   ```

   Confirm with `git branch --show-current` that you are **not** on `main` or `dev`.
5. Set its Status to `IN PROGRESS`.
6. Restate, in five lines or fewer: the phase number, its branch, its deliverables, and its
   exit gate.
7. Build the phase's features **one at a time**, in `PROGRESS.md` order, using
   `/next-feature` for each. Never two at once. Never leave one `[!]`.
8. Nothing from a later phase. No placeholder stubs for future phases.
9. When every feature of the phase is `[x]`, run `/phase-check`, then `/ship`.

If the phase's scope is ambiguous, state your interpretation and proceed — do not stall.
If it contradicts a doc, stop and ask.

$ARGUMENTS
