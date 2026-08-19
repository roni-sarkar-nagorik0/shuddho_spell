export const SPEECH_SCORER = Symbol('SPEECH_SCORER');

/**
 * What the browser heard, and what it was supposed to be.
 *
 * A **transcript**, never audio. `07-speech-scoring.md` makes that a hard
 * constraint rather than a default: the Web Speech API transcribes in the
 * browser and only the text is posted, so the server holds no recording of
 * anybody's voice unless they have explicitly asked it to.
 */
export interface IPronunciationScoreInput {
  /** The target word's IPA, from the curated `words` table G2P. */
  readonly expectedIpa: string;
  /** What the browser's recogniser returned, as text. */
  readonly heardTranscript: string;
  /** The written form, for confusions that are only visible orthographically. */
  readonly expectedText: string;
}

export interface IPhonemeScore {
  readonly expected: string;
  readonly heard: string;
  /** 0..1. Partial credit is the point — see the diagnosis below. */
  readonly credit: number;
}

/**
 * A nameable, fixable error rather than a mark.
 *
 * "You said /w/ where /v/ belongs; your lower lip should touch your top teeth"
 * is a lesson. A score of 0 is not, and `07` is explicit that scoring `wery`
 * for `very` at zero teaches nothing and drives learners off.
 */
export interface IPronunciationDiagnosis {
  readonly expected: string;
  readonly heard: string;
  readonly articulationFix: string;
}

export interface IPronunciationScore {
  readonly scorePercent: number;
  readonly perPhoneme: readonly IPhonemeScore[];
  readonly diagnoses: readonly IPronunciationDiagnosis[];
}

/**
 * Scores a spoken attempt.
 *
 * Synchronous, and that is a real constraint on the implementation rather than
 * an oversight: Phase 6 scores by comparing transcripts against a curated
 * confusion map, which is a lookup. A future acoustic model that needs to await
 * something replaces this port's shape at that point, deliberately, rather than
 * every use case having been written `await`-shaped years early for a
 * capability nobody has.
 */
export interface ISpeechScorer {
  readonly score: (input: IPronunciationScoreInput) => IPronunciationScore;
}
