# 00 — Product overview

## The problem

Bengali speakers who have studied English for years still fail on three specific axes:

1. **Spelling.** Not random typos — systematic ones. Doubling errors (`stoping`), silent
   letters (`nowledge`), `-tion` / `-sion` confusion, `y → i` before suffixes.
2. **Pronunciation.** L1 transfer from Bangla phonology. Bangla has no /v/, no /θ/, no /ð/,
   no /z/ in the same distribution, and disallows initial /sk/ /sp/ /st/ clusters — so
   `very → wery`, `think → tink`, `zoo → joo`, `school → ishkul`.
3. **Sentence construction.** Bangla is SOV with postpositions and no articles. English is
   SVO with prepositions and obligatory articles. So: dropped articles, wrong prepositions,
   verb-final word order, tense-aspect mismatch.

Generic English apps do not name any of these. ShuddhoSpell names all of them, per learner,
per phoneme, per rule family.

## The product

A **28-day program** (with a compressed 21-day sprint track). Each day is one session of
roughly 25–45 minutes moving through five stages:

| Stage | What happens |
| --- | --- |
| **Review** | Spaced-repetition items due today, injected before anything new. Capped at 25. |
| **Learn** | New words with IPA, syllable breakdown, Bangla sound line, Bangla meaning, rule family. |
| **Dictate** | Hear the word, type it into letter tiles. Errors are tagged, not just marked wrong. |
| **Speak** | Say the word. Browser transcribes, server scores and diagnoses the L1 substitution. |
| **Build** | Reorder chips into a correct English sentence from a Bangla prompt. |

Five exams punctuate the program:

| Code | Day (standard / sprint) | Duration | Questions | Pass | Attempts | Cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| `diagnostic` | 0 | 20 min | 30 | — (sets `currentDayIndex`) | — | — |
| `milestone1` | 7 / 5 | 45 min | 60 | 70% | 3 | 24h |
| `milestone2` | 14 / 11 | 60 min | 80 | 75% | 3 | 24h |
| `milestone3` | 21 / 16 | 60 min | 80 | 80% | 3 | 24h |
| `final` | 28 / 21 | 120 min | 150 | 80% | 2 | 48h |

Every graded exam has the same four sections:
**dictation 35% · pronunciation 20% · grammar-and-construction 30% · reading-to-writing 15%.**

Passing the final issues a certificate with a public verification code, and a day-1 vs
day-28 comparison.

## The three engines

Everything else in the codebase is plumbing around these. Get them right.

1. **Spaced repetition** — a deterministic interval ladder, not SM-2. See `06-spaced-repetition.md`.
2. **Speech scoring** — forgiving and *diagnostic*; a near miss must teach, not punish.
   See `07-speech-scoring.md`.
3. **Exam engine** — server-authoritative in every dimension: clock, questions, answers,
   attempt limits. See `08-exam-engine.md`.

## Content scale

- 1,240 words across 28 days
- 560 sentence items
- 44 phonemes
- 24 rule families

This is real linguistic content. It is generated one week at a time, validated after each
week, and anything uncertain is flagged rather than invented. See `10-content-pipeline.md`.

## Tone of the product

A dense professional instrument, not a game. No emoji, no gradients, no illustration, no
confetti. Separation is a 1px hairline, not a shadow. Numbers are monospaced and tabular.
The learner is an adult who wants to see exactly where they stand.

## Two audiences, two languages

The UI ships complete in `en` and `bn`. Bangla is real Bangla script — never transliteration.
CI fails on any key present in `en` and missing in `bn`.
