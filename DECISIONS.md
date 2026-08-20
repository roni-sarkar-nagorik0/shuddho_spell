# DECISIONS.md

The decisions that shape ShuddhoSpell, and what each one costs.

This is **not** the full record. [`ARCHITECTURE.md §5`](ARCHITECTURE.md) holds all 67 numbered
decisions in the order they were made, each tied to the feature that forced it, plus the open
items nobody has resolved. This file is the twelve a newcomer needs before they can read the
code without being surprised — and every one of them has a cost, written down, because a
decision recorded without its cost is advocacy rather than a record.

---

## 1. One Next.js application, not an app and an API

**Context.** The obvious shape for this product is a frontend plus a backend service.

**Decision.** One project. The App Router serves the UI *and* the API; route handlers under
`src/app/api/v1/*` are three-line re-exports of handlers built in the feature modules.

**Cost.** No independent scaling of the API, and no language choice for the backend. What it
buys is that a Server Component and its endpoint call **the same use case** — so they cannot
disagree, which two projects always eventually do.

## 2. Clean Architecture with the boundary enforced by lint, not review

**Context.** Layer rules that live in a document are layer rules that erode.

**Decision.** Four layers per module, and `eslint-plugin-boundaries` fails the build on a
violation. When a rule genuinely blocks correct work the fix is a **new port**, never an
exception.

**Cost.** More files, and a real cost paid twice in Phase 13 — `/api/metrics` had to grow an
`IMetricsReader` port rather than reading the database directly. That is the rule working.

## 3. The server decides everything that matters

**Context.** An exam that a browser can influence is not an exam.

**Decision.** The clock, the questions, the answers, the attempt count and the score all live
on the server. `correctAnswer` appears in **no** response before submission, and the only shape
that carries it is the post-submission review.

**Cost.** More round trips and a more complicated client. What it buys is that the exam is
worth something.

## 4. Google is the only door

**Context.** Every additional auth method is a second place to get it wrong.

**Decision.** Google OAuth only. No email/password, no magic link, no OTP. There is no email
input anywhere in the product, and `src/lib/auth/one-door.test.ts` sweeps the tree to keep it
that way.

**Cost.** A learner without a Google account cannot use the product. It also makes end-to-end
sign-in untestable by automation, which is why the e2e suite mints a session through Supabase
instead of driving a consent screen.

## 5. Plain SQL migrations, no ORM

**Context.** RLS, partial unique indexes and `pg_cron` are the interesting half of this schema.

**Decision.** Numbered SQL files, applied by a checksum-verifying migrator. Repositories map
rows to entities by hand.

**Cost.** Every column is written three times — SQL, row interface, mapper. What it buys is
that nothing between the code and the database is guessing, and that an index only exists with
the query it serves named in a comment beside it.

## 6. RLS written as if the API did not exist

**Context.** Application-level ownership checks are one forgotten `where` clause from a leak.

**Decision.** Row-level security on every learner table, and use cases that *also* check
ownership. Two independent layers.

**Cost.** Duplicated logic, and a check that is invisible to every unit test in the repo —
which is why `scripts/rls-two-user.mjs` exists to test it from outside. **That script has never
been executed.**

## 7. Interfaces, never `type`; no `enum`; no `any`, `as` or `!`

**Context.** A codebase drifts one convenience at a time.

**Decision.** Object shapes are `interface`. Unions come from frozen const objects. Zod
validates at the edges only, and the interface is the source of truth the schema must satisfy.

**Cost.** Occasional friction — `exactOptionalPropertyTypes` means an absent optional prop is
spread away rather than passed as `undefined`, which is uglier than the alternative and more
correct.

## 8. The learner's timezone, not the server's

**Context.** Streaks, review due dates and the "three different calendar days" mastery rule are
all statements about the learner's day.

**Decision.** `LocalDate` resolves an instant to a calendar day in the profile's zone, once, at
the boundary. Nothing downstream can get it wrong twice.

**Cost.** Every date comparison goes through a value object. Someone in UTC+6 answering at 23:50
has answered today, which is the whole point.

## 9. Diagnostic tags, never a boolean

**Context.** "Wrong" tells a learner nothing they did not already know.

**Decision.** A wrong answer carries error tags — `V_W_SUBSTITUTION`, `SILENT_LETTER` — and
mastery is tracked per phoneme and per rule family, so the product can say *what* is wrong.

**Cost.** Content must be authored with the tags in mind, and 24 of the 1,240 transcriptions are
flagged `ipaNeedsReview` rather than guessed (ARCHITECTURE.md D65).

## 10. Colour is never the only signal

**Context.** The product is a dense instrument built on a heat scale, and green-against-amber is
exactly the pair that disappears for the commonest colour blindness.

**Decision.** Every heat cell states its percentage in its accessible name, unattempted cells are
dashed rather than pale, deltas carry an arrow and a sign, status badges require their label, and
the exam navigator says "answered" / "flagged for review" / "blank" in words.

**Cost.** More markup, and several e2e assertions written against accessible names so that
anyone who later makes a state colour-only breaks the build rather than only the reader.

## 11. A component gallery instead of Storybook

**Context.** `13-frontend.md` asks for Storybook.

**Decision.** `/gallery` renders every shared component in three states, inside this
application, and 404s in production. This is a **departure from a doc**, stated plainly rather
than filed as an omission (ARCHITECTURE.md D66).

**Cost.** No controls panel and no publishable static site. What it buys is one build and one
dependency tree, and a broken state that fails `pnpm typecheck` here rather than passing in a
parallel one.

## 12. Build-mode: features first, verification paused

**Context.** The user set this on 2026-08-19 — every feature built and visible, not proved.

**Decision.** Phases 10–13 shipped under `pnpm typecheck && pnpm lint` alone. Phase 13's own
deliverables *are* verification, so its tests were written and run for real; everything needing
a live database, a browser or a CI runner was written and **not** executed.

**Cost.** This is the largest one in the file. Three tests had been red since Phase 7 and nobody
knew, because the suite was not being run. Coverage sits at 57.20% against a 90% floor. The
application has never been rendered in a browser. Every item is enumerated in the closing report
at the end of [`PROGRESS.md`](PROGRESS.md), and none of it is claimed as done.
