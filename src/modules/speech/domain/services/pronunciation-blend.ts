/**
 * `07-speech-scoring.md`, in numbers.
 *
 * Half the mark comes from how close the transcript is to the word and half
 * from how the sounds compare, and the split is not arbitrary. The
 * orthographic half is what the recogniser is actually good at — it heard
 * *something* and wrote it down — while the phoneme half is what the product
 * is teaching. Weighting either to 100% breaks in a known way: all
 * orthographic and `wery` scores the same as `wall`; all phoneme and a wholly
 * unrelated word scores well whenever no confusion happens to fire.
 */
const ORTHOGRAPHIC_WEIGHT = 0.5;
const PHONEME_WEIGHT = 0.5;

/**
 * The floor and the ceiling of a named near miss.
 *
 * The floor is the spec's, and it is the whole argument of the document: a
 * learner who says `wery` for `very` has made a precise, nameable, fixable
 * error, and scoring it 0 teaches nothing and drives them off. The ceiling is
 * the other half of the same sentence — 65–90 — and it matters just as much,
 * because an attempt with a named error is not a 95 and a learner told it was
 * has no reason to fix anything.
 */
const NEAR_MISS_FLOOR = 65;
const NEAR_MISS_CEILING = 90;

const PERFECT = 100;

export interface IBlendInput {
  /** 0..1 — the transcript against the closest acceptable spelling. */
  readonly orthographicSimilarity: number;
  /** 0..1 — the mean per-phoneme credit. */
  readonly phonemeScore: number;
  /** Whether the confusion map explained the difference at all. */
  readonly hasNamedConfusion: boolean;
  /**
   * Whether the explanation is a *single* miss the map predicted almost
   * exactly. A wholly wrong word that some row improves by a letter is not
   * one, and floors do not apply to it.
   */
  readonly isSingleNamedMiss: boolean;
}

/**
 * Blends the two halves and applies the near-miss band.
 *
 * Rounded to a whole number on the way out because it is stored in a
 * `numeric(5,2)` column and shown as a percentage; a score that reads 81 in the
 * UI and 81.2499 in the database is two answers to one question.
 */
export function blendPronunciationScore(input: IBlendInput): number {
  const raw =
    (ORTHOGRAPHIC_WEIGHT * input.orthographicSimilarity + PHONEME_WEIGHT * input.phonemeScore) *
    PERFECT;

  if (!input.hasNamedConfusion) {
    return clamp(Math.round(raw), 0, PERFECT);
  }

  const ceiling = Math.min(Math.round(raw), NEAR_MISS_CEILING);

  return input.isSingleNamedMiss ? clamp(ceiling, NEAR_MISS_FLOOR, NEAR_MISS_CEILING) : ceiling;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
