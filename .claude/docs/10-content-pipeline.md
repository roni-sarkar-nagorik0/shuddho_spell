# 10 — Content pipeline and seeding

This is the phase that makes the app worth using. **Do not shortcut it.**

## Not a giant SQL file

Content lives in a typed `content/` directory, one source file per week, validated by Zod at
build time. A malformed word entry fails the build **naming the exact file and line**.

```
content/
  schema.ts            the Zod schemas
  validate.ts          the cross-file checks one file cannot make about itself
  index.ts             validates the whole corpus at module load
  phonemes.ts          44 entries
  rule-families.ts     24 entries
  exams.ts             the 5 exam definitions and their section weights
  week-01.ts           …  week-04.ts        the taught corpus, 750 words per week
  week-0N.words.txt / .sentences.txt / .meta.json   the authoring inputs and counts
  grammar/             28 days of grammar, 112 checks — days-01-07 … days-22-28
  word-families/       412 IELTS families, 2,299 words — by topic, six files
```

**Two corpora, kept apart at the directory level.** `week-*` is taught: every word there is
drilled, examined and seeded into `words`. `word-families/` is a **reference** for the
`/library/families` screen — nothing in it is drilled or seeded, and folding it in would put
2,299 untaught words into the exam distractor pool and the dictation queue. It carries no IPA at all:
inventing 2,299 transcriptions to fill a column would put unverified claims on the one screen
whose whole subject is being right about English, and the screen instead links a word to its
library row when it is also one of the taught 3,000. It
asserts its own floor (`WORD_FAMILY_MINIMUM_WORDS = 1800`) so a de-duplication that quietly
dropped the count fails the build rather than leaving a product claim standing and untrue.

## The CLI

```bash
pnpm content:validate    # runs in prebuild — a malformed entry cannot reach a deploy
pnpm content:report      # the counts, the rule-family coverage, the flagged IPA
pnpm content:author      # generate content/week-0N.ts from its pipe-separated .txt inputs
pnpm content:seed        # validate → diff → apply
pnpm content:seed:dry
```

`pnpm content:validate` runs in `prebuild` alongside `pnpm i18n:check`, so "a malformed word
entry fails the build" is true because of the script, not because somebody remembered to run
it. `content/index.ts` validates on import for the same reason.

It **validates → diffs against the database → applies only changes.** That is what makes
content editable after launch without a migration and without wiping learner progress.
A second run is a no-op diff. That is a phase-exit check.

## Scale requirements

| Item | Count | Required fields |
| --- | --- | --- |
| Words | **3,000** across 28 days (750 per week) | `text`, `ipa`, `syllables`, `phonemeIds`, `banglaSound`, `banglaMeaning`, `partOfSpeech`, `ruleFamily`, **≥2 realistic `commonMisspellings`** |
| Sentence items | 560 | `banglaText`, `englishText`, **≥2 `acceptedAlternatives`**, `distractorWords`, `grammarRuleIds`, `difficulty` |
| Phonemes | 44 | real articulation notes; Bangla equivalent where it exists, and where it does **not**, an explicit note saying so plus the substitution Bengali speakers actually make |
| Rule families | 24 | a statement, **3 examples**, **2 counterexamples** |
| Exams | 5 | code, unlock day, duration, question count, pass mark, attempts, cooldown, section weights |
| Grammar days | 28 (112 checks) | level, statement, examples, and the checks that follow it |
| Word families | 412 / **2,299 words** | `root`, `forms` (one terse string, parsed at load), `topic` from a closed list, IELTS skill letters, and a `rule` that must resolve to one of the 24 |

`commonMisspellings` must be *realistic* — the misspellings Bengali speakers actually
produce, tied to the word's rule family. `recieve` for `receive`, yes. `xqzve`, no. These
strings feed the `ErrorTagger` and the exam distractors, so garbage here degrades two engines.

## Generation process — one week at a time

**Generate exactly one week, run the validator, report the counts back, then continue.**

A week is authored as `week-0N.words.txt` and `week-0N.sentences.txt` — one pipe-separated
line per entry — and `pnpm content:author` generates the committed `week-0N.ts` from them.
The TS object form is ten lines per word against 750 words a week, and a review that has to
scroll past 7,000 lines of punctuation is a review nobody does. The generated file is still
the source of truth; the text file is a way of writing it, not a second place it lives.

Batching four weeks into one response gets truncated, and truncated content fails silently —
you end up with 900 words and a passing build. One week per pass, counts reported after each.

## Never invent linguistics

If you cannot produce authentic IPA for a word, set:

```ts
ipaNeedsReview: true
```

and leave the field with your best attempt clearly marked. **Do not invent IPA and present
it as fact.** At the end of the phase, report the full list of flagged entries so a human
can review them.

The same rule applies to `banglaSound`, `banglaMeaning` and `banglaEquivalent`. Real Bangla
script, real meanings, or a `needsReview` flag. Never transliteration standing in for Bangla,
and never a plausible-looking guess.

## Distribution across the 28 days

- Weeks map to increasing difficulty and to the rule families introduced that week.
- Each `ProgramDay` carries `wordIds`, `sentenceItemIds`, `ruleFamilyIds` and
  `estimatedMinutes` that actually reflect the content volume — a day whose items take 70
  minutes but claims 30 breaks the learner's trust and the streak mechanic.
- `frequencyRank` drives ordering within a day: high-frequency words first.

## Validation rules the Zod schema must enforce

- `phonemeIds` all resolve to real phonemes
- `ruleFamily` resolves to one of the 24
- `syllables.join('')` matches `text` ignoring hyphenation marks
- `commonMisspellings.length >= 2`, and none equals `text`
- `acceptedAlternatives.length >= 2`, and none equals `englishText`
- `banglaText` and `banglaMeaning` contain Bangla script codepoints, not Latin
- no duplicate `text` across the whole corpus
- word count per day within tolerance of `estimatedMinutes`
