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

`IClock` · `IIdGenerator` · `ISpeechScorer` · `IUnitOfWork` · `IRateLimiter` ·
`IPushSender` · `IInAppNotifier`

(No `IMailer` — the app sends no email. See `09-notifications.md`.)

## Use cases (Phase 4)

`GetProgramOverview` · `GetProgramDay` · `StartLessonSession` · `AdvanceLessonStage` ·
`SubmitDictationAttempt` · `SubmitConstructionAttempt` · `CompleteLessonSession` ·
`GetDueReviewItems` · `SubmitReviewAttempt` · `GetMasterySnapshot` · `GetProgressSummary` ·
`GetLearnerDashboard`

Each ships with a unit test using in-memory fakes and a `FakeClock`. The awkward cases are
mandatory, not optional:

1. a stage submitted out of order
2. a session resumed the next day
3. a review item answered correctly twice in the **same calendar day** — must **not** count
   as two toward mastery
4. a streak across a timezone change
5. an attempt on a word not in today's lesson
