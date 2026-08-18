# 06 — Spaced repetition engine

**Deterministic, not SM-2.** No ease factors, no floating-point drift, no per-item
divergence you cannot explain to a learner.

## The ladder

Fixed intervals, in days:

```
rung:      0     1     2     3     4
interval:  1     3     7    16    35
```

- A **correct** answer advances one rung (capped at rung 4).
- A **wrong** answer drops to **rung 0**. Not one rung back — all the way to 0.
- `dueAt = now + intervalDays[rung]`, computed in the learner's timezone at their day
  boundary, not at the exact submission instant.

## Mastery

`isMastered` becomes `true` after **3 consecutive correct answers on 3 different calendar
days**.

The "different calendar days" clause is the whole point. Answering the same item correctly
three times in one session is not mastery, it is short-term memory. There is a mandatory
unit test for this: two correct answers on the same calendar day count as **one** toward
`consecutiveCorrect` for mastery purposes.

Mastered items are not dropped. They still return **once** at rung 4 (35 days).

## Selecting today's due items

At the **start** of a day's session, before any new material:

1. Select items where `dueAt <= now` (learner-local).
2. Cap at **25**.
3. Order by **how overdue** they are (most overdue first), then by **lowest accuracy**.

The cap is a product decision, not a performance one: a learner returning after two weeks
must not face a 200-item wall. The remainder stay due and surface tomorrow.

## Swappability

The ladder lives behind `IReviewSchedulingPolicy`:

```ts
export const REVIEW_SCHEDULING_POLICY = Symbol('REVIEW_SCHEDULING_POLICY');

export interface IReviewSchedulingPolicy {
  readonly nextInterval: (intervalIndex: number, isCorrect: boolean) => number;
  readonly nextDueAt: (intervalIndex: number, isCorrect: boolean, now: Date) => Date;
  readonly isMastered: (consecutiveCorrect: number, distinctDays: number) => boolean;
}
```

Nothing outside the policy knows the numbers `1, 3, 7, 16, 35`. Grep for them; if they
appear in a use case, a controller, or a React component, that is a bug.

## Where review items come from

1. A wrong dictation, pronunciation or construction attempt during a lesson.
2. A **failed exam**, which writes a prescription of drills into `review_items` (see
   `08-exam-engine.md`).
3. A word whose rule family the learner has demonstrably weak mastery on.

## Timezone correctness

Every date comparison in this engine goes through the learner's `timezone`. Use `IClock` for
"now" and the profile timezone for day boundaries. A learner in UTC+6 who finishes at 23:50
local has ended *that* day; the server's UTC date is irrelevant.

## Required tests

- correct answer advances exactly one rung; rung 4 stays at rung 4
- wrong answer resets to rung 0 from every rung including 4
- two correct answers same calendar day → `consecutiveCorrect` increments once for mastery
- three correct on three distinct days → `isMastered === true`
- a mastered item still returns once at 35 days
- 40 due items → exactly 25 returned, most overdue first, ties broken by lowest accuracy
- a learner in UTC+6 crossing midnight local but not UTC
