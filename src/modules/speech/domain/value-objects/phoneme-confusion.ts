import { type ConfusionKind } from './confusion-kind';

/**
 * How a substitution shows up in **writing**, because a transcript is writing.
 *
 * The browser hands the server text, not sound — `07-speech-scoring.md` makes
 * that a hard privacy constraint rather than a convenience — so a confusion
 * over /v/ and /w/ has to be recognisable as `very` arriving as `wery`. That
 * is what this is: the orthographic shadow of the phoneme swap.
 */
export interface IGraphemeShift {
  readonly from: string;
  readonly to: string;
}

/**
 * One nameable, fixable Bengali-speaker pronunciation error.
 *
 * `partialCredit` is the whole argument of `07-speech-scoring.md` in one field.
 * A learner who says `wery` for `very` has made a precise error with a precise
 * remedy; scoring it zero teaches nothing and drives them off, so the phoneme
 * still earns most of its marks and the learner is told exactly what to move.
 */
export interface IPhonemeConfusion {
  /** Stable, human-readable — it is what a diagnosis is keyed and logged by. */
  readonly id: string;
  readonly kind: ConfusionKind;
  /** Bare IPA. The sound the word actually contains. */
  readonly expected: string;
  /** Bare IPA. What a Bengali speaker commonly produces instead. */
  readonly commonlyHeardAs: readonly string[];
  /** 0..1. */
  readonly partialCredit: number;
  /** What the learner reads. Written as an instruction, not a description. */
  readonly articulationFix: string;
  /** Real Bangla script. Never transliteration — `CLAUDE.md` section 10. */
  readonly banglaNote: string;
  /**
   * Empty for every kind but `substitution`: an epenthetic vowel, a dropped
   * cluster and a stress error are structural, and a detector recognises their
   * *shape* rather than a letter swap.
   */
  readonly graphemeShifts: readonly IGraphemeShift[];
}
