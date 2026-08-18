---
description: Convert illegitimate `type` aliases to interfaces and report the exceptions
---

Find every `type` alias in the codebase.

For each, decide whether it is a **legitimate** union, mapped, conditional,
template-literal or tuple type.

- Convert every other one to an `interface`.
- Leave the legitimate ones, including the `typeof X[keyof typeof X]` unions derived from
  frozen const objects — those are required by the no-enum rule.

While you are there, also report and fix:

- any `enum`
- any `any`
- any `!` non-null assertion
- any `as` that is **not** immediately after a Zod parse at a validated boundary
- any non-`readonly` property on an entity or DTO

Give me two lists: **conversions made**, and **legitimate exceptions** with a one-line
justification each. Then run `pnpm typecheck && pnpm lint` and paste the output.

$ARGUMENTS
