---
description: Begin the next unfinished build phase under its documented boundaries
---

Start the next phase of the ShuddhoSpell build.

1. Read `CLAUDE.md` in full.
2. Read `BUILD-ORDER-COMPLETE.md` and identify the **first** phase whose Status is not `DONE`.
   If a phase is `IN PROGRESS`, that is the one — do not skip past it.
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
7. Build **only** what is under *Deliverables*. Nothing from a later phase. No placeholder
   stubs for future phases.
8. When the deliverables are complete, run `/phase-check`, then `/ship`.

If the phase's scope is ambiguous, state your interpretation and proceed — do not stall.
If it contradicts a doc, stop and ask.

$ARGUMENTS
