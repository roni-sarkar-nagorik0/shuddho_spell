# 08 — Exam engine

**Server-authoritative, no exceptions.** The client displays; the server decides. Every
number that matters — the clock, the questions, the answers, the attempt count, the score —
lives on the server and is never accepted from the browser.

## Definitions

| Code | Unlock day (standard / sprint) | Duration | Questions | Pass | Max attempts | Cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| `diagnostic` | 0 | 20 min | 30 | none — sets `currentDayIndex` | — | — |
| `milestone1` | 7 / 5 | 45 min | 60 | 70% | 3 | 24h |
| `milestone2` | 14 / 11 | 60 min | 80 | 75% | 3 | 24h |
| `milestone3` | 21 / 16 | 60 min | 80 | 80% | 3 | 24h |
| `final` | 28 / 21 | 120 min | 150 | 80% | 2 | 48h |

Sections on every graded exam:

| Section | Weight |
| --- | --- |
| dictation | 35% |
| pronunciation | 20% |
| grammar-and-construction | 30% |
| reading-to-writing | 15% |

## Entities

`ExamDefinition` · `IExamSectionDefinition` · `ExamAttempt` · `ExamQuestion` · `ExamAnswer`

```
ExamAttempt    profileId, definitionCode, attemptNumber, status, startedAt,
               serverDeadlineAt, submittedAt, currentSectionIndex, scorePercent,
               sectionScores[], passed, seed
ExamQuestion   attemptId, sectionCode, orderIndex, type, payload, correctAnswer, weight
ExamAnswer     questionId, submittedValue, isCorrect, awardedPoints, flagged,
               answeredAt, timeSpentMs
```

`ExamStatus`: `scheduled` · `in_progress` · `submitted` · `passed` · `failed`.

## Pure domain services

Both have **zero I/O** so they are unit-testable in isolation:

- **`ExamScoringService`** — takes answers + questions + section weights, returns a score.
  No repository, no clock, no client.
- **`ExamBlueprintService`** — selects an attempt's questions from the definition's blueprint
  plus the learner's own weakest items, **deterministically from a `seed` stored on the
  attempt**, so an attempt is reproducible for support and for tests.

## The nine hard rules

Each one needs a test that fails if the behaviour breaks.

1. **The deadline is set once.** `StartExamAttempt` computes
   `serverDeadlineAt = now + durationSeconds` and persists it. It is **never** extended —
   not on resume, not on reconnect, not on a section boundary. The client clock is display only.
2. **Late writes are rejected.** Any answer or section submission where
   `now > serverDeadlineAt` → **409 `EXAM_TIME_EXPIRED`**.
3. **`correctAnswer` never leaks.** Questions are generated at attempt-start and persisted
   *with* their correct answers, but the correct answer appears in **no response body**
   before the attempt is submitted. Write a snapshot test over **every** exam response and
   assert its absence.
4. **Sections are sequential and one-way.** `SubmitSection` locks it. There is no endpoint,
   anywhere, that can reopen a submitted section. Not an admin one, not a debug one.
5. **Attempt limits and cooldowns are server-enforced.** A fourth `milestone1` attempt →
   **409 `EXAM_ATTEMPTS_EXHAUSTED`**. A retake inside the cooldown → 409 with the remaining
   time in the problem detail.
6. **A crash loses nothing.** `GetActiveExamAttempt` returns the attempt, the current
   section, saved answers, and **remaining seconds computed from the server clock**.
   A closed browser, a refresh, a dead battery — all resume exactly where they were, with the
   time that actually elapsed deducted.
7. **Passing advances the program.** A pass advances `currentDayIndex` and unlocks the next
   block.
8. **Failing prescribes.** A fail writes a **prescription of drills into `review_items`**,
   targeted at the sections and rule families that lost the marks. A fail must leave the
   learner with a concrete next action, never just a number.
9. **Abandoned attempts self-clear.** A `pg_cron` job auto-submits attempts past their
   deadline, so a stale `in_progress` attempt never blocks a retake.

## Use cases

`GetExamCatalogue` · `GetExamDefinition` · `StartExamAttempt` · `GetActiveExamAttempt` ·
`SaveExamAnswer` · `FlagExamQuestion` · `SubmitExamSection` · `SubmitExamAttempt` ·
`GetExamResult` · `GetExamAnswerReview` · `GetExamReadiness`

**`GetExamReadiness`** predicts a score from recent attempt accuracy weighted by section
weight, and returns the **three topics most likely to cost marks**. It is what makes the
exam lobby honest instead of decorative.

## Frontend contract (Phase 12)

- `/exams/attempt/[id]` is primary-900, with **no navigation out** of the runtime.
- The countdown is driven by the server's remaining seconds, interpolated locally between
  syncs. It is never the sole source of truth — a submission is still validated server-side.
- Timer turns `secondary-500` (#E9A13B) at 5:00 and `tertiary-500` (#C24A3C) at 0:60, each with an
  `aria-live` announcement.
- The fixed bottom navigator shows answered / current / flagged / blank states.
- A `beforeunload` warning is active during an attempt.
- Exam writes are **never retried** by TanStack Query. A retried answer write after a
  deadline is a support ticket.

## The attack suite

Phase 7 and Phase 13 both run it. Every one must be rejected or resumed correctly:

- submit an answer after the deadline
- move the system clock forward mid-attempt
- submit the same section twice
- start a second concurrent attempt
- refresh at the 30-second mark
- replay a saved answer request after submission
- request the review endpoint before submission
