---
description: Find and fix Clean Architecture layer violations by adding ports, not loosening lint
---

The boundaries lint rule may be passing while infrastructure types still leak into
application.

1. Audit **every** import in `apps/api/src/modules/*/application/` and
   `apps/api/src/modules/*/domain/`.
2. List each violation with its **file and line**, and say which rule it breaks:
   - a domain file importing anything outside domain
   - an application file importing infrastructure, Nest infrastructure, Supabase, or Zod
   - a row interface (snake_case shape) appearing outside `infrastructure/`
   - `Date.now()` / `new Date()` outside an `IClock` adapter
   - `process.env` outside the validated env module
   - a concrete class injected where a token should be
3. Fix each one by **introducing the missing port interface** — never by loosening the lint
   rule, never by moving the file, never with `eslint-disable`.
4. Re-run `pnpm lint && pnpm typecheck` and paste the output.

Report: the violation list, the ports you added, and anything you could not fix and why.

$ARGUMENTS
