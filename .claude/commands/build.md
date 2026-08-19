---
description: The single entry point — preflight, then build, test, fix and ship five features one at a time, stop
---

Build ShuddhoSpell. **Five features per invocation, one at a time.** Run this command again for
the next five.

Steps 0–2 run **once**. Step 3 is a loop you go round **five times** — a full pick, build, test,
fix and ship for each feature, exactly as if it were the only one. Step 4 reports all of them.

**Stop at the first failure — do not continue past a red step**, and never carry a red feature
into the next lap. Five is a ceiling, not a quota: the stop conditions in step 3f beat it.

If `$ARGUMENTS` names a number, build that many instead of five.

---

## Step 0 — Preflight

```bash
ls -la .env .env.local 2>/dev/null
```

**Missing → STOP.** Say exactly this and end the turn:

> No env file found. Copy `.env.example` to `.env.local` and fill in sections 1 and 2
> (core + Supabase — the four values come from the Supabase dashboard). I'll stop here until it exists.

Do not scaffold. Do not start "the parts that don't need env".
**Never read the file** — existence check only.

---

## Step 1 — Load the rules

Read, in this order:

1. `CLAUDE.md` — the stack, the rules checklist, the git rules, the working rhythm
2. `PROGRESS.md` — which features are next
3. `BUILD-ORDER-COMPLETE.md` — the current phase's deliverables and exit gate
4. every doc listed under that phase's *Reads* in `.claude/docs/`

Read them once, at the top. Re-read a doc mid-run only when a later feature reaches into a
phase whose *Reads* you have not loaded yet.

---

## Step 2 — Branch

```bash
git branch --show-current
```

- On `main` → **stop**, stash, `git checkout dev && git pull origin dev`, cut the phase branch, pop, and say it happened.
- On `dev` → cut the phase branch from it (the **Branch** value on the phase in `BUILD-ORDER-COMPLETE.md`).
- Already on the correct phase branch → continue.

```bash
git checkout dev && git pull origin dev
git checkout -b <phase branch>
```

All five features land on this one branch. Do not cut a second branch mid-run.

---

## Step 3 — The loop: five features, one at a time

Go round this loop five times. **Finish a lap completely — committed and pushed — before
starting the next.** There is never more than one feature in flight.

### 3a — Pick exactly one feature

From `PROGRESS.md`, in this priority order:

1. any feature marked `[!]` (failed), or any row in **Blocked / failed** → **that is your work**
2. any feature marked `[~]` (left mid-flight) → finish it
3. otherwise the **first `[ ]`** in the topmost unfinished phase

Mark it `[~]`. Update the **NEXT** block at the top of `PROGRESS.md`.

Announce it in one line: the lap number, the feature id, its title, and its phase.

**One `[~]` in the file at any moment.** Marking the next feature is the first act of the next
lap, never something you do in advance.

### 3b — Build only that feature

Nothing from the next feature. No stubs for later phases. No "while I'm here" refactors.
If you spot something else that needs doing, write it down and keep going.

Building five in a row is not licence to widen any one of them, and a later lap is not a reason
to reach forward from an earlier one. If feature 2 would be easier with something from feature 4,
that is still scope creep — build 4 in lap 4.

Obey without exception:

- four layers, the dependency rule, ports and the composition root
- interfaces not types, no `enum`, no `any`, no `as`, no `!`, `readonly` everywhere
- one Next.js app — no separate backend, no second `package.json`
- identity from the session only; nothing client-trusted
- no `process.env` outside `src/lib/env.ts`

### 3c — Test it

The feature's test cases are listed beneath it in `PROGRESS.md`. Write them. Run them.
**Paste the real output — every lap.** A summary of five runs is not evidence; five outputs are.

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Plus `pnpm test:e2e` when the feature touches sign-in, a lesson or an exam.

### 3d — If anything is red

1. Mark the feature `[!]` and add a row to **Blocked / failed** in `PROGRESS.md`.
2. **Debug it.** Find the actual cause, not a symptom. State the diagnosis in one line.
3. Fix it. Re-run. Repeat until green.

**Do not** start the next feature. **Do not** park it for later. **Do not** delete, skip or
weaken a test, and **do not** disable a lint rule, to go green.
A red test is information; a deleted red test is a lie.

If it cannot be fixed — it needs the user, a credential, or something that does not exist yet —
**end the whole run here**, laps remaining or not. Report what shipped, and leave the `[!]` and
its **Blocked / failed** row standing for the next invocation.

### 3e — Finish it and ship it

Only once everything is green:

- mark the feature `[x]` with today's date
- add a one-line row to the **Log**
- clear its row from **Blocked / failed**
- move the **NEXT** pointer to the following `[ ]`

Then check the diff and ship:

```bash
git diff --staged        # no key, token, .env file, service-role credential or VAPID key
git add -A
git commit -m "<type>(<scope>): <what changed>"
git push -u origin <feature branch>
```

**One commit per feature**, every lap — never one commit for the batch. The history has to stay
bisectable, and a five-feature commit hides which one broke something.

Then land it on `dev` — every lap, not once at the end:

```bash
git checkout dev && git pull origin dev
git merge <feature branch>          # --ff-only when it fast-forwards
git push origin dev
git checkout <feature branch>
git merge --ff-only dev             # bring the branch back up, so the next lap merges clean
```

**The user asked for this on 2026-08-19**, overriding the older "feature work lands on `dev`
via PR" rule. No PR, no waiting for a review.

Merging per lap, not per run, is deliberate: a run that dies on lap 4 still leaves laps 1–3
in `dev` instead of stranding them on a branch.

If the merge is not a fast-forward, a plain merge commit is correct. **Never rebase a branch
you have already pushed and never force-push** to keep the graph linear — a merge commit is
the cheaper price. If the merge conflicts, stop the run and report it; do not guess a resolution.

Never touch `main`. Never force-push. Never delete a branch — not even a merged one.

### 3f — Next lap, or stop

Go back to 3a, unless one of these is true — then stop the run and go to step 4:

- **five features are done** (or the count `$ARGUMENTS` asked for)
- **a feature could not be made green** (3d)
- **the feature just shipped completed its phase** — run the phase's full exit gate, flip its
  **Status** to `DONE`, append any unspecified decision to `ARCHITECTURE.md`, and stop. The next
  phase needs its own branch cut from a `dev` that carries this one, and that is a merge decision
  for the user, not something to do mid-run.
- **there is nothing left to pick** in the topmost unfinished phase

---

## Step 4 — Stop

Report **one block per feature built**, in order:

```
Built:     F1.4 — eslint-plugin-boundaries, five zones
Tests:     <the actual output>
Committed: feat/01-app-scaffold @ <sha>
```

Then close with a single:

```
Next:      F1.9 — the first feature you did not build
```

If the run stopped early, say which of 3f's conditions ended it, in one line.

**Do not roll into the next five.** Run `/build` again for that.

$ARGUMENTS
