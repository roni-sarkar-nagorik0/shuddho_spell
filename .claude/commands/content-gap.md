---
description: Fill thin course content one week at a time, validating after each week
---

Fill the gaps in the course content.

1. Report the current counts first: words per day, sentence items, phonemes, rule families.
   Name the weeks that are thin.
2. Generate the missing content **one week at a time**, using the `content/` Zod schema.
3. After **each** week: run the validator, report the counts back, and wait before continuing.
   Never batch multiple weeks — the response gets truncated and the loss is silent.
4. Requirements per entry:
   - every word: `text`, `ipa`, `syllables`, `phonemeIds`, `banglaSound`, `banglaMeaning`,
     `partOfSpeech`, `ruleFamily`, and **≥2 realistic** `commonMisspellings` tied to its rule family
   - every sentence item: `banglaText`, `englishText`, **≥2** `acceptedAlternatives`
   - Bangla in **real Bangla script**, never transliteration
5. **Never invent IPA.** Anything you are unsure of gets `ipaNeedsReview: true`, and the full
   flagged list is reported at the end for human review.

Target: 1,240 words across 28 days, 560 sentence items.

$ARGUMENTS
