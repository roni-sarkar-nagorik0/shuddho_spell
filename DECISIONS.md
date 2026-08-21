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

## 13. Deployed in Seoul, because that is where the database is

**Context.** Supabase for this project lives in `ap-northeast-2` (Seoul). Vercel's default
region is `iad1` (Washington). Every read a page does is a round trip between the two, and the
dashboard issues seven of them.

**Decision.** [`vercel.json`](vercel.json) pins `regions: ["icn1"]` — Vercel's Seoul region,
the same city as the database. Measured against the project from Dhaka, one Supabase round trip
is ~80 ms for auth and ~30 ms for a query when the function is beside it; across the Pacific it
is several times that, on every one of the seven.

The same file declares the two cron jobs. They had no schedule at all before it — the routes
existed and nothing ever called them. Vercel Cron sends **GET**, so both routes export the
handler on GET as well as POST; the `withCron` bearer check is unchanged and is still the only
thing standing in for a session.

**Both run once a day, and that is a plan limit rather than a design.** Vercel's Hobby plan
refuses any cron expression that would fire more than daily — the deployment fails, it does not
degrade — so the hourly cadence both jobs were written for is not available.

`0 14 * * *` for notifications is 20:00 in Asia/Dhaka, which is `PreferenceDefaults`'
`DEFAULT_REMINDER` for a learner who has never opened the preferences screen. Vercel's ±59
minute Hobby precision is survivable here only because the job snaps its own clock to
`topOfHour`, so a run at 14:47 still computes the 14:00 bucket.

**Cost.** Three, and the second is severe.

Seoul is not near the learners. This trades a little latency to the browser for a lot of latency
to the database, which is the right way round while every page is `force-dynamic` and does its
reads on the server — but it is a trade, and if the pages ever become mostly static the sums
reverse.

`run-hourly-notifications.ts` is built to run every hour and ask each learner *"is this your
hour?"* against their own timezone — that is how one job serves every timezone without sending a
UTC+6 learner their 20:00 reminder at 2am. On one run a day, that question is asked once, so
**only learners whose reminder hour lands in that single run hear anything at all**. Anybody in
another timezone, or who moved their reminder time, gets nothing. This is not a reduced service;
it is a mostly absent one, and it is the reason to move to Pro.

The exam backstop degrades far more gently, because the part that actually matters is not on
this schedule. `pg_cron` is enabled on the production database and 009's `exam-autosubmit` job
runs **every minute**, verified against the live project. That is what enforces rule 9 — an
abandoned attempt never blocks a retake — and it is unaffected by any of this. The Postgres
function deliberately only marks an attempt `submitted` and never grades it, so what a daily
Vercel run delays is the **marking**, by up to 24 hours. A learner is never locked out; their
abandoned paper is just scored late.

On Pro both schedules go back to `0 * * * *` and both jobs behave as written.

## 14. Next 16, and `middleware.ts` becomes `proxy.ts`

**Context.** The project shipped on Next 15.5.4, which `pnpm audit` reports against with a
critical RCE and four proxy-bypass advisories. 15.5.23 closes all of them; 16 was taken instead,
because both the toolchain and the runner underneath were moving at the same time — GitHub's
runners now default to Node 24, and staying on 15 would have meant a second upgrade shortly
after this one.

**Decision.** `next@16.3.1`, `eslint-config-next@16.3.1`, Node 24 in both workflows.

Two changes came with it and neither was optional. Next 16 requires `jsx: "react-jsx"` in
`tsconfig.json` and rewrites the file itself on the first build if it is not there — which is
worth knowing, because that rewrite happens *mid-build* and fails the build it happens in. The
value is committed so no clean checkout ever meets that.

The second is the file this decision is named after. Next 16 renames the middleware convention
to `proxy` and deprecates the old name. `src/middleware.ts` is now `src/proxy.ts` and its export
is `proxy`, by way of the official codemod; the body is unchanged, `src/proxy.test.ts` is the
same suite under the new name, and the build output labels it `ƒ Proxy (Middleware)`.

**Cost.** `.claude/docs/04-authentication.md` step 4 still says `middleware.ts`, and it has been
left saying it. The docs are the requirement and this is a framework rename underneath them, so
it is recorded here rather than edited there — the same direction §11 takes. `PROGRESS.md`'s
F3.4 entry also still names the old path, which is correct: it is a log of what was true that
day.

Next 16 also builds with Turbopack by default, which is why the Edge-runtime warning D24
describes no longer appears in the build output. D24's reasoning is unchanged; only the warning
is gone.

## 15. The demo answers back: a sentence, an auto-play, and Enter

**Context.** The panel worked and stopped there. A visitor who spelled a word right was left
with four labelled facts, dead tiles and a mouse-only *Next word* — and the word they had just
learnt was a word they had only ever heard alone, at 0.85, with nothing around it. English
rhythm does not exist in a single word. Neither does the accent the course is about.

**Decision.** Three changes, all on the same panel.

*The word in a sentence.* `IDictationDemoWord` now carries an optional
`{ id, english, bangla }` drawn from `sentence_items` — the same sentences the construction
stage builds, never composed for the page. It plays at **1.00**, not the dictation rate, and
that difference is the point: a lone word is slowed because there is no context to recover a
missed consonant from, and a sentence must not be, because the context is the thing being
demonstrated.

*It plays itself.* A word the visitor asked for speaks on arrival. The word the page **loaded
with** does not — a page that talks the moment it renders is what every autoplay policy exists
to stop, and the visitor has not agreed to make a noise yet. The auto-play runs off their click
on *Next word*, which is the user gesture the speech engine wants.

*Enter, twice.* Getting a word right moves focus to *Next word*. There is no key handler
anywhere — a focused `<button>` is activated by Enter because that is what a button is — and
the same move is what makes the state change audible to a screen reader.

**How the sentence is found, and what it costs.** Postgres can be asked for
`english_text ilike '%hand%'` and nothing more precise, so it also answers with *handle*,
*shorthand* and *beforehand*. `SentenceItem.contains` is what throws those away; without it the
panel keeps working and simply teaches the wrong word, which is the worst kind of regression.

The corpus has 560 sentences against 1,065 demonstrable words, and **496 of those words — 46.6%
— appear in one**. One candidate would therefore leave the row empty about half the time, so
the use case draws **five** and probes them **together**: `0.534^5 ≈ 4%` miss, measured at
**28 of 30** against the seeded database. Five sequential probes would have cost five round
trips; issued at once they cost one, and a test asserts the overlap rather than trusting the
shape of the code.

**Cost.** `/api/v1/demo/word` went from a **433 ms** median to **566 ms** — one round trip,
measured locally against the real database with the probe removed and restored. The landing
page itself is unaffected: `readDictationDemoWord` is still behind `unstable_cache`.

The other cost is honest and worth stating: **the pool is no longer uniform.** A word that
appears in a sentence is now more likely to be shown than one that does not. For a demo whose
whole job is to show the exercise working that is the right bias, but it is a bias, and it is
recorded in the DTO as well as here.

## 16. The alphabet on the landing page, and a second client component

**Context.** Under the hero the page opened on a table of eight misspellings. That is a fair
description of the problem and a poor invitation — there is nothing to do, and a visitor could
learn what the course is about without ever hearing it. A visitor who arrived on a phone, or
who read the dictation tiles as work, met a page about pronunciation that could only be read.

**Decision.** Twenty-six letters they can press, as the first section under the hero. Each says
itself in the reference accent and opens one panel: the letter's **name** in IPA, that name in
Bangla script, and the sound it spells — kept apart deliberately, because *H* is called /eɪtʃ/
and spells /h/, and a learner who cannot tell those apart writes *aitch*.

Six of the twenty-six are marked. They are exactly the letters whose characteristic sound
Bangla has no equivalent for — t, d, v, z, r, w — and what a Bengali speaker produces instead
is **quoted verbatim from `content/phonemes.ts`**, the reviewed forty-four that migration
`010_seed_reference` seeds. Nothing about phonology is written on the marketing page. The count
in the prose is derived from the data rather than typed beside it, and a test asserts they
still agree.

**Cost.** `src/app/page.tsx` said "no client JavaScript except the dictation demo". There are
now two, which is a deliberate revision of that budget rather than a slip: the strip ships 26
rows of text and a click handler, not a library, and it shares `useSpeech` with the demo, so
the second one costs almost nothing the first had not already paid.

`useSpeech` itself is the other half of this. There were four hand-rolled `speechSynthesis`
callers before it and there were about to be five; the two on the landing page now share one,
and `components/lesson/audio-manager.tsx` deliberately does **not** — it queues, reports
progress and is driven by a lesson's state machine, and merging them would give the marketing
page a state machine it has no use for.
