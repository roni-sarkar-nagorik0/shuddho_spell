# `.claude/docs` — feature reference

Detailed, authoritative explanation of every feature of ShuddhoSpell. `CLAUDE.md` is the
rules; `BUILD-ORDER-COMPLETE.md` is the order; these are the *what and why*.

Before any of these, read [`PROGRESS.md`](../../PROGRESS.md) — it names the one feature you
may work on right now.

| Doc | Covers | Needed in phase |
| --- | --- | --- |
| [00-overview](00-overview.md) | the product, the problem, the 28-day program, the five exams, the two corpora | all |
| [01-architecture](01-architecture.md) | four layers, the dependency rule, DI tokens, use case shape, errors, transactions | 1, 3–8 |
| [02-typescript-rules](02-typescript-rules.md) | interfaces-only, no enum, no any, readonly, Zod at the edges | all |
| [03-database](03-database.md) | all 22 migrations, table conventions, RLS, triggers, indexes, row interfaces | 2, 5 |
| [04-authentication](04-authentication.md) | Google-only OAuth, `proxy.ts`, guards, identity, bootstrap, the two roles | 3 |
| [05-domain-model](05-domain-model.md) | every entity, value object, port, domain service, use case; grammar, families, demo | 2, 4, 5 |
| [06-spaced-repetition](06-spaced-repetition.md) | the `[1,3,7,16,35]` ladder, mastery, due selection, timezones | 4, 11 |
| [07-speech-scoring](07-speech-scoring.md) | privacy, G2P, the Bengali confusion map, the score blend, diagnoses | 6, 11 |
| [08-exam-engine](08-exam-engine.md) | the five exams, server authority, the nine hard rules, the attack suite | 7, 12 |
| [09-notifications](09-notifications.md) | three channels, the policy service, timezone scheduling, idempotency | 8 |
| [10-content-pipeline](10-content-pipeline.md) | typed content files, the CLIs, scale, the reference corpus, never inventing linguistics | 9 |
| [11-api-surface](11-api-surface.md) | the envelope, problem+json codes, every route, cursor pagination | 1, 5, 7, 8 |
| [12-design-system](12-design-system.md) | colour tokens, typography, layout, small screens, the two signature components, a11y | 1, 10–12 |
| [13-frontend](13-frontend.md) | server vs client, data layer, every screen, small screens, the fragile interactions | 10–12 |
| [14-quality-gates](14-quality-gates.md) | lint, tests, coverage floors, the content and i18n gates, CI, security, performance | every phase exit |
| [15-git-workflow](15-git-workflow.md) | branch structure, the pre-push gate, what never to run | every commit and push |
| [16-environment](16-environment.md) | env var rules, public vs secret, boot validation | 1, 7, 8, 13 |

These docs describe **what is built**, not what is planned. Where the code and a doc disagree,
the code wins and the doc is wrong — fix the doc. Where a doc describes something deliberately
not built (`IMailer`, `withAction`, the weekly-report cron), it says so in place.
