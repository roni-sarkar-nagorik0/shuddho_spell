---
description: Run the current phase's exit gate and report honestly
---

> **BUILD MODE — feature-first, verification paused. Set by the user 2026-08-19.**
> Section 0 of `CLAUDE.md` governs. While it stands, everything in this file about **writing
> tests, running `pnpm test` / `pnpm test:e2e`, coverage floors, and phase exit gates is
> PAUSED** — not deleted, and it all comes back the moment that block is removed.
> The check that still runs is **`pnpm typecheck && pnpm lint`**. A feature is `[x]` when it is
> **built and merged into `dev`**. Never report a skipped gate or an unrun test as a pass.

> **This command exists only to run an exit gate, so while the pause stands it does nothing
> but report.** If invoked: say the gate is paused, then list the phase's features from
> `PROGRESS.md` with their real marks, and run `pnpm typecheck && pnpm lint` for a live
> signal. Do not tick a single gate checkbox.

Verify the current phase against its exit gate in `BUILD-ORDER-COMPLETE.md`.

For **each** checkbox in the gate:

- run the actual command
- paste the actual output
- mark it pass or fail

Then check `PROGRESS.md`:

- [ ] every feature of this phase is `[x]`
- [ ] the **Blocked / failed** table is empty
- [ ] no feature is left `[~]`
- [ ] the **Log** and the **NEXT** pointer are current

Then run the cross-phase invariants at the bottom of the file:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Rules:

- **Do not** mark the phase `DONE` unless every gate item passed on real output.
- **Do not** delete, skip or weaken a test to make a gate pass. Report the failure.
- **Do not** disable a lint rule to make a gate pass. Fix the code.
- If items remain, leave Status as `IN PROGRESS` and write the remaining list into the phase.
- If every item passed: set Status to `DONE`, fill the `Completed:` line with today's date,
  and append any unspecified decision you made to `ARCHITECTURE.md`. Then run `/ship` to
  commit and open a PR into `dev`.
- **A red gate means nothing gets pushed.** The branch stays local until it is green.
  Never push to `dev` directly and never touch `main`.

Finish by reporting what passed, what failed, and what you would fix first.

$ARGUMENTS
