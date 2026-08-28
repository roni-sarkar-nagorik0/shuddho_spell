# 05 — Domain model

Three groups: global content, per-learner state, and exams. Exams have their own doc
(`08-exam-engine.md`); the entities are listed here for completeness.

## Content (global, read-only to learners)

| Entity | Fields |
| --- | --- |
| `Phoneme` | `symbol` (IPA), `type` (vowel \| consonant \| diphthong), `banglaEquivalent \| null`, `articulationNote`, `commonBengaliSubstitution \| null` |
| `Word` | `text`, `ipa`, `syllables[]`, `phonemeIds[]`, `banglaSound`, `banglaMeaning`, `partOfSpeech`, `ruleFamilyId`, `weekIndex`, `frequencyRank`, `commonMisspellings[]` |
| `RuleFamily` | `statement`, 3 `examples`, 2 `counterexamples` |
| `SentenceItem` | `banglaText`, `englishText`, `acceptedAlternatives[]`, `distractorWords[]`, `grammarRuleIds[]`, `difficulty` |
| `ProgramDay` | `dayIndex` 1..28, `weekIndex`, `title`, `description`, `wordIds[]`, `sentenceItemIds[]`, `ruleFamilyIds[]`, `estimatedMinutes` |

The **24 rule families**: doubling, drop-the-e, y-to-i, silent letters, `-tion`/`-sion`,
plurals, articles, tense, prepositions, and the rest — each with a statement, three
examples and two counterexamples. `banglaEquivalent: null` on a phoneme is meaningful data,
not missing data: it means Bangla has no such sound, and
`commonBengaliSubstitution` then says what learners actually produce instead.

## Learner state (per user, RLS-protected)

| Entity | Fields |
| --- | --- |
| `LearnerProfile` | `userId`, `displayName`, `track` (standard28 \| sprint21), `dailyMinutes`, `startedAt`, `timezone`, `uiLanguage` (en \| bn), `currentDayIndex`, `accentPreference`, `playbackRate` |
| `LessonSession` | `profileId`, `dayIndex`, `stage` (review \| learn \| dictate \| speak \| build), `startedAt`, `completedAt`, `itemsTotal`, `itemsCorrect` |
| `Attempt` | `sessionId`, `itemType` (word \| sentence), `itemId`, `mode` (dictation \| pronunciation \| construction), `submittedValue`, `isCorrect`, `score` 0..100, `errorTags[]`, `latencyMs`, `createdAt` |
| `ReviewItem` | `profileId`, `itemId`, `itemType`, `intervalIndex`, `dueAt`, `timesSeen`, `timesCorrect`, `consecutiveCorrect`, `isMastered`, `lastErrorTags[]` |
| `MasteryRecord` | `profileId`, `dimension` (phoneme \| ruleFamily), `dimensionId`, `attempts`, `correct`, `accuracy`, `lastUpdatedAt` |
| `StreakRecord` | `profileId`, `currentStreak`, `longestStreak`, `lastActiveDate`, `freezesRemaining` |

## Entities carry behaviour

An entity that is only data is a missed abstraction. Required behaviour:

- **`LessonSession.advanceStage()`** — enforces the legal stage order
  `review → learn → dictate → speak → build`. Skipping or going backwards is a domain error,
  not a UI concern.
- **`ReviewItem.recordResult(isCorrect, now)`** — applies the interval ladder. Returns a new
  instance. See `06-spaced-repetition.md`.
- **`StreakRecord.registerActivity(date, timezone)`** — handles day boundaries in the
  **learner's** timezone. A learner in UTC+6 finishing at 23:50 local has a different day
  boundary than the server. Get this right; it is the single most-reported bug class in
  streak features.

## Value objects

`DayIndex` (1..28, guarded at construction) · `ScorePercent` (0..100) · `IpaTranscription` ·
`Track` · `ErrorTag`.

A value object validates in its constructor and cannot exist in an invalid state. That is
why `DayIndex` exists instead of `number`.

## Repository ports

Each with its `Symbol` token, in `domain/repositories/`:

`IWordRepository` · `IProgramRepository` · `ILessonRepository` · `IAttemptRepository` ·
`IReviewItemRepository` · `IMasteryRepository` · `IStreakRepository` ·
`ILearnerProfileRepository`

## Domain services

- **`ReviewSchedulingPolicy`** — the `[1, 3, 7, 16, 35]` ladder, behind
  `IReviewSchedulingPolicy` so it can be swapped and tested.
- **`MasteryCalculator`** — rolls attempts up into per-phoneme and per-rule-family accuracy.
- **`ErrorTagger`** — maps a wrong answer to *named* tags: `DOUBLE_CONSONANT`,
  `SILENT_LETTER`, `ARTICLE_MISSING`, `V_W_SUBSTITUTION`, `TENSE_MISMATCH`,
  `PREPOSITION_WRONG`, `WORD_ORDER`, `Y_TO_I`, `TION_SION`. This is what makes the product
  diagnostic rather than a quiz — never replace a tag with a boolean.

## Application ports

Shared: `IClock` · `IIdGenerator` · `IRandom` · `ISpeechScorer` · `IMetricsReader`
Per module: `IPushSender` · `IInAppNotifier` · `ILessonWriteUnit` · `IExamWriteUnit`

(No `IMailer` — the app sends no email. See `09-notifications.md`.)

**`IUnitOfWork` could not be built, and `ILessonWriteUnit` / `IExamWriteUnit` replace it.** A
callback unit of work assumes the caller can open a transaction and run arbitrary statements
inside it. Supabase speaks PostgREST: every call is its own HTTP request and therefore its own
transaction, and no amount of TypeScript arranges four of them into one. `run(work)` would
have compiled, run, and provided no atomicity at all — a lie in a type, which is worse than
the missing feature. Each method on these ports is instead **one Postgres function call**: the
domain decides every value, the function writes them together or not at all.
`IRateLimiter` is real and lives in `src/contracts`, Postgres-backed (migration `012`).
`IRandom` exists for the same reason `IClock` does: the blueprint service seeds an attempt's
question selection, and a use case that reached for `Math.random()` would not be reproducible.

## What was built after this doc was written

| Area | What is real now |
| --- | --- |
| Roles | `LearnerProfile.role` (`user` \| `admin`), migration `020`. The database makes the first admin; only an admin makes an admin; the last admin cannot be demoted. See `04-authentication.md` |
| Onboarding | `onboarding_completed_at` (migration `011`) is what `/auth/callback` reads — not "does a profile row exist", which the signup trigger makes true immediately |
| Grammar | a `grammar` module: `GrammarLesson`, `GetGrammarSyllabus`, `GetGrammarLesson`. 28 days, 112 checks, ungated |
| Word families | `WordFamily` in `library` — the 412-family reference corpus. Read-only, never drilled, never seeded into `words` |
| Demo | `DemoAttempt` in `progress` (migration `021`). The landing drill has no `lesson_session` and never will, so it does not borrow `attempts` — that would mean making `attempts.session_id` nullable, weakening a constraint every real attempt depends on |
| Practised words | `GetWordsPractised` / `GetPractiseLog` over migration `022`'s paged function. The grouping is SQL because the alternative is reducing months of attempts in memory |
| Certificates | `Certificate`, `GetCertificate`, `VerifyCertificate` — the last reading the public `certificate_verifications` view |

## Use cases (Phase 4)

`GetProgramOverview` · `GetProgramDay` · `StartLessonSession` · `AdvanceLessonStage` ·
`SubmitDictationAttempt` · `SubmitPronunciationAttempt` · `SubmitConstructionAttempt` ·
`CompleteLessonSession` · `GetDueReviewItems` · `SubmitReviewAttempt` · `GetWeakSpots` ·
`GetPracticeQueue` · `GetMasterySnapshot` · `GetProgressSummary` · `GetWeeklyActivity` ·
`GetLearnerDashboard`

Several of these have **no route handler**, and that is correct: a use case earns one when
something on the client calls it. `11-api-surface.md` lists which.

Each ships with a unit test using in-memory fakes and a `FakeClock`. The awkward cases are
mandatory, not optional:

1. a stage submitted out of order
2. a session resumed the next day
3. a review item answered correctly twice in the **same calendar day** — must **not** count
   as two toward mastery
4. a streak across a timezone change
5. an attempt on a word not in today's lesson
