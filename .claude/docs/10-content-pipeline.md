# 10 — Content pipeline and seeding

This is the phase that makes the app worth using. **Do not shortcut it.**

## Not a giant SQL file

Content lives in a typed `content/` directory, one source file per week, validated by Zod at
build time. A malformed word entry fails the build **naming the exact file and line**.

```
content/
  phonemes.ts          44 entries
  rule-families.ts     24 entries
  week-01.ts
  week-02.ts
  …
  week-04.ts
```

## The CLI

```bash
pnpm content:seed
```

It **validates → diffs against the database → applies only changes.** That is what makes
content editable after launch without a migration and without wiping learner progress.
A second run is a no-op diff. That is a phase-exit check.

## Scale requirements

| Item | Count | Required fields |
| --- | --- | --- |
| Words | 1,240 across 28 days | `text`, `ipa`, `syllables`, `phonemeIds`, `banglaSound`, `banglaMeaning`, `partOfSpeech`, `ruleFamily`, **≥2 realistic `commonMisspellings`** |
| Sentence items | 560 | `banglaText`, `englishText`, **≥2 `acceptedAlternatives`**, `distractorWords`, `grammarRuleIds`, `difficulty` |
| Phonemes | 44 | real articulation notes; Bangla equivalent where it exists, and where it does **not**, an explicit note saying so plus the substitution Bengali speakers actually make |
| Rule families | 24 | a statement, **3 examples**, **2 counterexamples** |

`commonMisspellings` must be *realistic* — the misspellings Bengali speakers actually
produce, tied to the word's rule family. `recieve` for `receive`, yes. `xqzve`, no. These
strings feed the `ErrorTagger` and the exam distractors, so garbage here degrades two engines.

## Generation process — one week at a time

**Generate exactly one week, run the validator, report the counts back, then continue.**

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
