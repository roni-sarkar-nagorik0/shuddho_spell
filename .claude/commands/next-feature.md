---
description: Pick up the single next feature from PROGRESS.md, build it, test it, finish it
---

Work the **next single feature**. One only.

### 0. Preflight

```bash
ls -la .env.local
```

If it is missing, **stop immediately** and tell the user:

> `.env.local` is missing. Copy `.env.example` to `.env.local` and fill in sections 1 and 2
> (core + Supabase). I'll stop here until it exists.

Do not start the feature. Do not do "the parts that don't need env". **Never read the
file** — this is an existence check only.

### 1. Find it

Read `PROGRESS.md`.

- If the **Blocked / failed** table has any row, or any feature is `[!]` — **that is your
  work.** Debug it, fix it, get its tests green. Do not touch anything else.
- If a feature is `[~]` — finish that one. It was left mid-flight.
- Otherwise take the **first `[ ]`** in the topmost unfinished phase.

Mark it `[~]` and update the **NEXT** block at the top of the file.

### 2. Prepare

- Read the phase's *Reads* in `BUILD-ORDER-COMPLETE.md`.
- Confirm you are on the phase's feature branch, cut from an up-to-date `dev`:

  ```bash
  git branch --show-current
  ```

  Never `main`. Never `dev`.

### 3. Build only that feature

Nothing from the next feature. No stubs for later ones. If you notice something else that
needs doing, write it down — do not build it.

### 4. Test it

The feature's test cases are listed beneath it in `PROGRESS.md`. Write them, run them, paste
the real output.

```bash
pnpm typecheck && pnpm lint && pnpm test
```

### 5. If anything fails

- Mark the feature `[!]` and add a row to the **Blocked / failed** table.
- **Debug it — find the actual cause, not a symptom.** State the diagnosis.
- Fix it. Re-run. Repeat until green.
- **Do not start another feature.** Do not park it. Do not weaken, skip or delete a test to
  go green.

### 6. Finish it

Only when tests are green:

- mark it `[x]` with today's date
- add a one-line row to the **Log**
- clear its row from **Blocked / failed** if it had one
- move the **NEXT** pointer to the following `[ ]`
- commit and push the feature branch (`/ship`)

### 7. Stop

Report: what you built, the test output, what is next. **Do not roll into the next feature.**

$ARGUMENTS
