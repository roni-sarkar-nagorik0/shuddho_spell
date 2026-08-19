---
description: The single entry point — preflight, then build, test, fix and ship every remaining feature in one phase, close the phase, stop
---

Build ShuddhoSpell. **One whole phase per invocation.**

Steps 0–3 run **once**. Step 4 is a loop you go round for **every feature the phase has left** —
a full pick, build, test, fix and ship for each, exactly as if it were the only one. Step 5
closes the phase. Step 6 reports all of it.

A phase that is already part-built is resumed, not restarted: you take whatever is still `[ ]`
and finish the phase off.

**Stop at the first failure — do not continue past a red step**, and never carry a red feature
into the next lap. The whole phase is the target, not a quota: the stop conditions in step 4f
beat it.

If `$ARGUMENTS` names a number, stop after that many features instead of finishing the phase.
Use it for a short session; the phase stays `IN PROGRESS` and the next `/build` picks it up.

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
2. `PROGRESS.md` — the live state: which phases are open and what is left in each
3. `BUILD-ORDER-COMPLETE.md` — every phase's branch, deliverables and exit gate

`PROGRESS.md` wins where the two disagree. If `BUILD-ORDER-COMPLETE.md`'s **Status** for a phase
contradicts it, fix the stale one as you go — a drifted status sends the next run at the wrong phase.

---

## Step 2 — Pick the phase

In this priority order:

1. any feature marked `[!]`, or any row in **Blocked / failed** → **that feature's phase**
2. any feature marked `[~]` (left mid-flight) → **that feature's phase**
3. otherwise the **topmost phase that still has at least one `[ ]`**

A phase whose only remaining rows are `[-]` is finished. Set its **Status** and move down.

Then read **every doc listed under that phase's *Reads*** in `.claude/docs/`. Re-read one
mid-run only if a feature reaches into a phase whose *Reads* you have not loaded.

Announce in one line: the phase, its title, which features remain, and how many.

### A feature that depends on a phase that has not happened

It happens — a rate limiter needs a table that arrives three phases later. Do **not** leave it
`[~]`; that means *in flight* and it blocks the tracker and every later run.

Mark it `[-]`, and on the same row write the reason **and the phase it returns in**. Add a line
to that later phase's feature list pointing back at it. Say so in the report. Then carry on with
the rest of the phase — one deferred feature does not stop the other nine.

Defer only for a real missing dependency. "Awkward", "big" and "I'd rather do it later" are not
dependencies.

---

## Step 3 — Branch

The phase's **Branch** value in `BUILD-ORDER-COMPLETE.md` is the target.

```bash
git branch --show-current
```

- Already on the phase's branch → continue.
- On `main` → **stop**, stash, `git checkout dev && git pull origin dev`, cut the phase branch, pop, and say it happened.
- On any other branch (`dev`, or the *previous* phase's branch after it closed) → cut the phase branch from an up-to-date `dev`:

```bash
git checkout dev && git pull origin dev
git checkout -b <phase branch>
```

Every feature in this phase lands on this one branch. Do not cut a second branch mid-run.

---

## Step 4 — The loop: every feature the phase has left

Go round this loop until no `[ ]` remains in the phase. **Finish a lap completely — committed,
pushed and merged into `dev` — before starting the next.** There is never more than one feature
in flight.

### 4a — Pick exactly one feature

The **first `[ ]`** in this phase (or the `[!]`/`[~]` that sent you here). Mark it `[~]` and
update the **NEXT** block at the top of `PROGRESS.md`.

Announce it in one line: lap number, feature id, title.

**One `[~]` in the file at any moment.** Marking the next feature is the first act of the next
lap, never something you do in advance.

### 4b — Build only that feature

Nothing from the next feature. No stubs for later phases. No "while I'm here" refactors.
If you spot something else that needs doing, write it down and keep going.

Owning the whole phase is not licence to widen any one feature, and a later lap is not a reason
to reach forward from an earlier one. If F4.2 would be easier with something from F4.9, that is
still scope creep — build F4.9 in its own lap.

Obey without exception:

- four layers, the dependency rule, ports and the composition root
- interfaces not types, no `enum`, no `any`, no `as`, no `!`, `readonly` everywhere
- one Next.js app — no separate backend, no second `package.json`
- identity from the session only; nothing client-trusted
- no `process.env` outside `src/lib/env.ts`

### 4c — Test it

The feature's test cases are listed beneath it in `PROGRESS.md`. Write them. Run them.
**Paste the real output — every lap.** A summary of ten runs is not evidence; ten outputs are.

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Plus `pnpm test:e2e` when the feature touches sign-in, a lesson or an exam.

### 4d — If anything is red

1. Mark the feature `[!]` and add a row to **Blocked / failed** in `PROGRESS.md`.
2. **Debug it.** Find the actual cause, not a symptom. State the diagnosis in one line.
3. Fix it. Re-run. Repeat until green.

**Do not** start the next feature. **Do not** park it for later. **Do not** delete, skip or
weaken a test, and **do not** disable a lint rule, to go green.
A red test is information; a deleted red test is a lie.

If it cannot be fixed — it needs the user, a credential, or something that does not exist yet —
**end the whole run here**, features remaining or not. Report what shipped, and leave the `[!]`
and its **Blocked / failed** row standing for the next invocation. This is a failure, not a
deferral: `[-]` in step 2 is for a dependency you knew about before you started, never for a
test you could not get green.

### 4e — Finish it and ship it

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
git push -u origin <phase branch>
```

**One commit per feature**, every lap — never one commit for the phase. The history has to stay
bisectable, and a ten-feature commit hides which one broke something.

Then land it on `dev` — every lap, not once at the end:

```bash
git checkout dev && git pull origin dev
git merge <phase branch>            # --ff-only when it fast-forwards
git push origin dev
git checkout <phase branch>
git merge --ff-only dev             # bring the branch back up, so the next lap merges clean
```

**The user asked for this on 2026-08-19**, overriding the older "feature work lands on `dev`
via PR" rule. No PR, no waiting for a review.

Merging per lap, not per phase, is deliberate: a run that dies on lap 8 still leaves laps 1–7
in `dev` instead of stranding a phase's worth of work on a branch.

If the merge is not a fast-forward, a plain merge commit is correct. **Never rebase a branch
you have already pushed and never force-push** to keep the graph linear — a merge commit is
the cheaper price. If the merge conflicts, stop the run and report it; do not guess a resolution.

Never touch `main`. Never force-push. Never delete a branch — not even a merged one.

### 4f — Next lap, or stop

Go back to 4a, unless one of these is true:

- **no `[ ]` remains in the phase** → go to step 5 and close it
- **a feature could not be made green** (4d) → go to step 6, phase still `IN PROGRESS`
- **`$ARGUMENTS` capped the count and you have hit it** → go to step 6, phase still `IN PROGRESS`

Never roll into the next phase. That needs its own branch off a `dev` carrying this one, and
this run's `dev` merges have to be seen before the next phase starts.

---

## Step 5 — Close the phase

Only when every feature is `[x]` or `[-]`:

1. **Run the phase's full exit gate** from `BUILD-ORDER-COMPLETE.md` — every checkbox, real
   output, no checkbox ticked from memory. A gate item you cannot run (it needs the user's live
   project, a credential, a device) is **not** a pass: say which, say why, and say what proves
   it instead.
2. Flip **Status** to `DONE` in **both** `PROGRESS.md` and `BUILD-ORDER-COMPLETE.md`, and fill
   in **Completed:** with the date, the feature range, and any item the gate could not prove.
3. Append any decision you made that the docs did not specify to `ARCHITECTURE.md`, with the
   feature id that forced it.
4. Commit that, push, and merge it into `dev` the same way as a lap.

Do **not** cut the next phase's branch. The next `/build` does that from an up-to-date `dev`.

---

## Step 6 — Stop

Report **one block per feature built**, in order:

```
Built:     F1.4 — eslint-plugin-boundaries, five zones
Tests:     <the actual output>
Committed: feat/01-app-scaffold @ <sha>
```

Then close with:

```
Phase:     3 — Authentication (Google only) · DONE, exit gate 7/7 green
Deferred:  F3.9 — needs the profiles table from Phase 4 (marked [-])
Next:      Phase 4 — Domain and application layers
```

If the run stopped early, say which of 4f's conditions ended it and what is left, in one line.
If a gate item could not be run, say so here too — never fold it into a pass.

**Do not roll into the next phase.** Run `/build` again for that.

$ARGUMENTS
