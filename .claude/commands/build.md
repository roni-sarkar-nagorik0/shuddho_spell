---
description: The single entry point — preflight, pick the next feature, build it, test it, fix it, ship it, stop
---

Build ShuddhoSpell. **One feature per invocation.** Run this command again for the next one.

Work through these steps in order. **Stop at the first failure — do not continue past a red step.**

---

## Step 0 — Preflight

```bash
ls -la .env.local
```

**Missing → STOP.** Say exactly this and end the turn:

> `.env.local` is missing. Copy `.env.example` to `.env.local` and fill in sections 1 and 2
> (core + Supabase — `supabase start` prints the Supabase values). I'll stop here until it exists.

Do not scaffold. Do not start "the parts that don't need env".
**Never read the file** — existence check only.

---

## Step 1 — Load the rules

Read, in this order:

1. `CLAUDE.md` — the stack, the rules checklist, the git rules, the working rhythm
2. `PROGRESS.md` — which single feature is next
3. `BUILD-ORDER-COMPLETE.md` — the current phase's deliverables and exit gate
4. every doc listed under that phase's *Reads* in `.claude/docs/`

---

## Step 2 — Pick exactly one feature

From `PROGRESS.md`, in this priority order:

1. any feature marked `[!]` (failed), or any row in **Blocked / failed** → **that is your work**
2. any feature marked `[~]` (left mid-flight) → finish it
3. otherwise the **first `[ ]`** in the topmost unfinished phase

Mark it `[~]`. Update the **NEXT** block at the top of `PROGRESS.md`.

Announce it in one line: the feature id, its title, and its phase.

---

## Step 3 — Branch

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

---

## Step 4 — Build only that feature

Nothing from the next feature. No stubs for later phases. No "while I'm here" refactors.
If you spot something else that needs doing, write it down and keep going.

Obey without exception:

- four layers, the dependency rule, ports and the composition root
- interfaces not types, no `enum`, no `any`, no `as`, no `!`, `readonly` everywhere
- one Next.js app — no separate backend, no second `package.json`
- identity from the session only; nothing client-trusted
- no `process.env` outside `src/lib/env.ts`

---

## Step 5 — Test it

The feature's test cases are listed beneath it in `PROGRESS.md`. Write them. Run them.
**Paste the real output.**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Plus `pnpm test:e2e` when the feature touches sign-in, a lesson or an exam.

---

## Step 6 — If anything is red

1. Mark the feature `[!]` and add a row to **Blocked / failed** in `PROGRESS.md`.
2. **Debug it.** Find the actual cause, not a symptom. State the diagnosis in one line.
3. Fix it. Re-run. Repeat until green.

**Do not** start another feature. **Do not** park it for later. **Do not** delete, skip or
weaken a test, and **do not** disable a lint rule, to go green.
A red test is information; a deleted red test is a lie.

---

## Step 7 — Finish it

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

Never push to `dev` directly. Never touch `main`. Never force-push. Never delete a branch.

If this feature completes the phase, run the phase's full exit gate, then flip its **Status**
to `DONE` and append any unspecified decision to `ARCHITECTURE.md`.

---

## Step 8 — Stop

Report in this shape and end the turn:

```
Built:     F1.4 — eslint-plugin-boundaries, five zones
Tests:     <the actual output>
Committed: feat/01-app-scaffold @ <sha>
Next:      F1.5 — the type-alias-on-object ban
```

**Do not roll into the next feature.** Run `/build` again for that.

$ARGUMENTS
