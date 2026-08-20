# 15 — Git workflow

These rules are **absolute**. They outrank convenience, they outrank "it's just a small fix",
and they outrank a phase deadline. Breaking one is worse than shipping the phase late.

## Branch structure

```
main   ← protected. Integration only, via reviewed PR from dev. Never touched directly.
dev    ← the shared integration branch. All feature work lands here, merged straight in.
feat/… ← one branch per feature. Where you actually work.
```

| Branch | Who writes to it | How |
| --- | --- | --- |
| `main` | **nobody, directly** | PR from `dev`, reviewed and merged by a human |
| `dev` | you | merged directly from a feature branch, **after tests pass** — no PR |
| `feat/*` | you | direct commits while building |

## The five hard rules

1. **Never commit to `main`. Never push to `main`. Never merge into `main`.**
   Not a hotfix, not a typo, not a README change. If something must reach `main`, it goes
   `feat/* → dev` (you merge that part) `→ PR → a human merges dev into main`. Say so and
   stop; do not do the last step yourself.

2. **Never force-push.** No `git push --force`, no `git push -f`, no `--force-with-lease`
   on `main` or `dev`. On your own feature branch a force-push is tolerable only if that
   branch has never been shared. When in doubt: don't.

3. **Never delete a branch.** Not `main`, not `dev`, not a merged feature branch, not a
   branch that "looks stale". No `git branch -D`, no `git push origin --delete`.
   Cleanup is a human decision.

4. **Test before every push.** See the gate below. A push of untested code is the thing
   these rules exist to prevent.

5. **One feature, one branch.** Do not stack two features on one branch, and do not reuse a
   branch after its work has merged. A phase from `BUILD-ORDER-COMPLETE.md` is one feature.

## Branch naming

```
feat/<phase>-<slug>      feat/01-monorepo-scaffold, feat/07-exam-engine
fix/<slug>               fix/exam-timer-resume
chore/<slug>             chore/ci-supabase-service-container
docs/<slug>              docs/architecture-record
```

Phase branches carry their phase number. It makes the history readable against the build order.

## The loop

```bash
# 1. start from an up-to-date dev — never from main
git checkout dev
git pull origin dev

# 2. one branch for this feature
git checkout -b feat/07-exam-engine

# 3. build it (see BUILD-ORDER-COMPLETE.md for the phase's deliverables)

# 4. TEST — all of it, real output, before you even think about pushing
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e        # when the feature touches a critical flow

# 5. commit
git add -A
git commit -m "feat(exams): server-authoritative exam engine"

# 6. push the FEATURE branch first — never straight onto dev, never main
git push -u origin feat/07-exam-engine

# 7. land it on dev yourself
git checkout dev && git pull origin dev
git merge feat/07-exam-engine        # --ff-only when it fast-forwards
git push origin dev

# 8. bring the feature branch back up, so the next merge stays simple
git checkout feat/07-exam-engine
git merge --ff-only dev
git push origin feat/07-exam-engine
```

`dev` receives work by direct merge from a feature branch — **the user asked for this on
2026-08-19**, replacing the PR step that used to sit here. `main` still receives work only
through a PR from `dev`, merged by a human. There is no other path onto `main`.

A merge commit is correct when the merge will not fast-forward. **Never rebase a branch you
have already pushed, and never force-push,** to keep the graph linear. On a conflict: stop,
report it, and let the user decide — do not guess a resolution.

## The pre-push gate

**Every one of these must pass, on real output, before any push:**

- [ ] `pnpm typecheck` — clean
- [ ] `pnpm lint` — clean, with **no rule disabled** to get there
- [ ] `pnpm test` — green, with **no test skipped or deleted** to get there
- [ ] `pnpm test:e2e` — green, when the feature touches sign-in, a lesson, or an exam
- [ ] the current phase's exit gate in `BUILD-ORDER-COMPLETE.md` — every checkbox
- [ ] no secret, key, token or `.env` in the diff — check `git diff --staged` before committing
- [ ] the work was committed on a feature branch, not typed straight onto `dev` or `main`

If any of these fails: **do not push.** Report the failure with its output and fix it.
A red test is information. A deleted red test is a lie.

## Commit messages

Conventional commits, scoped to the module:

```
feat(exams): server-authoritative deadline and section locking
fix(review): count same-day correct answers once toward mastery
test(speech): 40-case confusion-map table suite
chore(ci): run integration tests against a Supabase service container
docs(architecture): record the unit-of-work decision
```

One logical change per commit. A commit that touches four modules for four reasons is four
commits.

## Never do these

| Command | Why |
| --- | --- |
| `git push origin main` | rule 1 |
| `git checkout main && git commit` | rule 1 |
| `git merge feat/… ` into `main` | rule 1 |
| `git push --force` / `-f` on `main` or `dev` | rule 2 — rewrites shared history |
| `git branch -D <anything>` | rule 3 |
| `git push origin --delete <anything>` | rule 3 |
| `git reset --hard origin/main` on a branch with work | destroys uncommitted work |
| `git commit --no-verify` | skips the hooks that run the gate |
| pushing with a failing test | rule 4 |

## If you are already on `main`

Stop. Do not commit.

```bash
git stash               # if you have uncommitted work
git checkout dev
git pull origin dev
git checkout -b feat/<phase>-<slug>
git stash pop
```

Then continue. Tell the user it happened.
