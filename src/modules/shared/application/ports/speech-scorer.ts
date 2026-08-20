export const SPEECH_SCORER = Symbol('SPEECH_SCORER');

/**
 * A pronunciation as an ordered list of sounds, with the syllable that carries
 * the emphasis.
 *
 * Segmented rather than a raw transcription string, because cutting IPA into
 * sounds needs the inventory of the 44 phonemes and the scorer is synchronous
 * — see `ISpeechScorer` below. The caller has already read the stored G2P to
 * write per-phoneme mastery, so it hands over what it already has instead of
 * making the scorer load the inventory a second time.
 */
export interface ISpokenForm {
  /** Bare IPA symbols, in order. */
  readonly phonemes: readonly string[];
  /** Which of them carries primary stress, or null when unmarked. */
  readonly stressIndex: number | null;
}

/**
 * What the browser heard, and what it was supposed to be.
 *
 * A **transcript**, never audio. `07-speech-scoring.md` makes that a hard
 * constraint rather than a default: the Web Speech API transcribes in the
 * browser and only the text is posted, so the server holds no recording of
 * anybody's voice unless they have explicitly asked it to.
 */
export interface IPronunciationScoreInput {
  /** The target word's sounds, from the curated `words` table G2P. */
  readonly expected: ISpokenForm;
  /** What the browser's recogniser returned, as text. */
  readonly heardTranscript: string;
  /** The written form, for confusions that are only visible orthographically. */
  readonly expectedText: string;
  /**
   * An observed pronunciation of what the learner actually said, when anything
   * can produce one. Null is the normal case: the Web Speech API returns words,
   * not sounds. Stress is the one error a transcript cannot carry — `hotel`
   * said with the emphasis on the first syllable is still written `hotel` — so
   * it is diagnosable only when this is present, and never guessed from text.
   */
  readonly heard: ISpokenForm | null;
}

export interface IPhonemeScore {
  readonly expected: string;
  /** Empty when the sound was left out of the word altogether. */
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
