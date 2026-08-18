---
description: Run the current phase's exit gate and report honestly
---

Verify the current phase against its exit gate in `BUILD-ORDER-COMPLETE.md`.

For **each** checkbox in the gate:

- run the actual command
- paste the actual output
- mark it pass or fail

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
