# 07 — Speech scoring

The scorer must be **forgiving and diagnostic**. A learner who says `wery` for `very` has
made a precise, nameable, fixable error. Scoring that 0 teaches nothing and drives them off.

## Privacy first

The **browser** transcribes using the Web Speech API and posts the *transcript*.
**The server never receives audio** unless the learner explicitly opts into storage.
This is a hard constraint, not a default.

## The port

```ts
export const SPEECH_SCORER = Symbol('SPEECH_SCORER');

export interface ISpeechScorer {
  readonly score: (input: IPronunciationScoreInput) => IPronunciationScore;
}

export interface IPronunciationScore {
  readonly scorePercent: number;
  readonly perPhoneme: readonly IPhonemeScore[];
  readonly diagnoses: readonly IPronunciationDiagnosis[];
}

export interface IPronunciationDiagnosis {
  readonly expected: string;
  readonly heard: string;
  readonly articulationFix: string;
}
```

It lives behind this port so a real acoustic model can replace it later **without touching a
single use case**. Scoring runs server-side in a route handler (`runtime = 'nodejs'`), never
in the browser — a client-computed score is a client-editable score.

## Grapheme-to-phoneme

The G2P mapping for the programme's 3,000 words is **stored in the `words` table**, not
computed at runtime. Runtime G2P for English is a research project; a curated lookup for a
closed vocabulary is correct and fast.

## The Bengali confusion map — data, not branches

Declared as an array, never as `if` chains:

```ts
export interface IPhonemeConfusion {
  readonly expected: string;
  readonly commonlyHeardAs: readonly string[];
  readonly partialCredit: number;     // 0..1
  readonly articulationFix: string;
  readonly banglaNote: string;
}
```

Minimum coverage — all of these must be present:

| Expected | Heard as | Example |
| --- | --- | --- |
| /v/ | /w/ | very → wery |
| /w/ | /v/ | wine → vine |
| /θ/ | /t/ | think → tink |
| /ð/ | /d/ | this → dis |
| /z/ | /dʒ/ | zoo → joo |
| /ʃ/ | /s/ | ship → sip |
| /s/ | /ʃ/ | sea → shea |
| /æ/ | /e/ | cat → ket |
| epenthetic vowel before /sk/ /sp/ /st/ | | school → ishkul, station → istation |
| dropped final consonant cluster | | asked → ask, texts → tex |
| first-syllable stress error | | ho**TEL** → **HO**tel |

Each entry carries the `articulationFix` the learner actually reads — "your top teeth touch
your bottom lip for /v/; /w/ uses no teeth at all" — and a `banglaNote` in real Bangla.

## The score blend

```
score = 50% × normalised Levenshtein similarity (transcript vs target)
      + 50% × phoneme-level match with partial credit from the confusion map
```

Then **clamp**: a single-phoneme miss on a *known* confusion never drops below **65**.

The stated rule from the spec: a near miss scores **65–90, never 0**. There is a test that
asserts this for every confusion pair.

## Required test cases (≥40, table-driven)

- a fully correct transcript → high 90s
- a near miss on **each** confusion pair → 65–90, with the correct named diagnosis
- a completely unrelated word → low, with no false diagnosis
- an **empty** transcript → 0 with a "not heard" diagnosis, never a crash
- a **homophone** (`their` / `there`) → handled explicitly, not accidentally
- a transcript containing **extra words** (the API picked up surrounding speech) → the
  target word is located and scored, extras do not tank the score

## Endpoint and write-through

`POST /lessons/sessions/:id/attempts` with `mode: 'pronunciation'` accepts the transcript and
returns the score. Every pronunciation attempt writes through to `mastery_records` so
per-phoneme accuracy updates immediately — that is what feeds the `MasteryMatrix` and the
`PhonemeStrip` tinting.
