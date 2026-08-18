---
description: Test, commit and push the current feature branch to dev — never to main
---

Ship the current feature's work. **Stop at the first failure. Do not continue past a red step.**

### 1. Check where you are

```bash
git branch --show-current
git status --short
```

- If the branch is **`main`** — stop immediately. Do not commit. Stash, `git checkout dev`,
  `git pull origin dev`, branch to `feat/<phase>-<slug>`, pop, and tell the user it happened.
- If the branch is **`dev`** — stop. Move the work to a feature branch first.
- Otherwise continue.

### 2. Run the gate — real output, pasted

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Plus `pnpm test:e2e` if this feature touches sign-in, a lesson, or an exam.
Plus every checkbox of the current phase's exit gate in `BUILD-ORDER-COMPLETE.md`.

**If anything is red: stop and report it.** Do not push. Do not delete or skip a test to go
green. Do not disable a lint rule to go green. Do not use `--no-verify`.

### 3. Check `PROGRESS.md`

The feature you are shipping must be `[x]` with its tests green, and the **Blocked / failed**
table must be empty. If a feature is still `[!]` or `[~]`, fix or finish it first — do not ship
around it.

### 4. Check the diff for secrets

```bash
git diff --staged
```

No key, token, `.env` file, service-role credential or VAPID private key in the diff.
`.env.example` may change; `.env.local` must never appear — it is gitignored and must never
have been read or written.

### 5. Commit and push the feature branch

```bash
git add -A
git commit -m "<type>(<scope>): <what changed>"
git push -u origin <feature-branch>
```

Conventional commits, one logical change per commit.

### 6. Open a PR into `dev`

```bash
gh pr create --base dev --head <feature-branch>
```

**`--base dev`. Never `--base main`.**

### Never, under any circumstance

- push, commit or merge to `main`
- push to `dev` directly
- `git push --force` / `-f` on any shared branch
- `git branch -D` or `git push origin --delete` on anything
- `git commit --no-verify`
- push with a failing gate

$ARGUMENTS
