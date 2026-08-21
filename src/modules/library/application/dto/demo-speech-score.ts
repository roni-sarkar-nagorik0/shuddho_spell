/**
 * What the browser heard, marked — for a visitor with no account.
 *
 * **The server never receives audio.** `07-speech-scoring.md` makes that a hard
 * constraint rather than a default: the Web Speech API transcribes inside the
 * browser and only the text is posted. That is as true of the marketing page as
 * it is of the course, and it is why this shape carries a transcript and no
 * recording, no blob and no upload url.
 */
export interface IDemoSpeechDiagnosis {
  readonly expected: string;
  readonly heard: string;
  /** What to do with the mouth. The reason a score of 0 is not the feedback. */
  readonly articulationFix: string;
}

/**
 * The extra findings the sentence step reports, and the word step does not.
 *
 * Every field is something a browser can actually establish. There is
 * deliberately **no grammar verdict**: a free spoken sentence has no target to
 * mark against, and a made-up mark on a page selling English precision would be
 * the least defensible thing on it. Grammar is marked inside the course, where
 * `SentenceItem.accepts` has a reviewed answer and a list of accepted
 * alternatives to mark against.
 */
export interface IDemoSentenceFindings {
  /**
   * Whether the word — or one of its regular forms — was actually in what was
   * said. *visited* counts for *visit*; *visitor* does not.
   */
  readonly usesTheWord: boolean;
  /** How many words were heard. A sentence is more than the word on its own. */
  readonly wordCount: number;
  /** Whether that is enough words to be a sentence rather than a fragment. */
  readonly isSentenceLength: boolean;
}

/**
 * The three things the demo can be asked to mark.
 *
 * `sentence-written` is not a lesser `sentence`. A typed sentence has **no
 * pronunciation to assess**, and running the confusion map over text somebody
 * typed would produce a number that looks like a pronunciation score and is
 * not one. So it is a mode of its own and it comes back with `scorePercent:
 * null` — an absence the caller has to handle, rather than a zero it might
 * render.
 */
export const DEMO_SPEECH_MODES = ['word', 'sentence', 'sentence-written'] as const;

export type DemoSpeechMode = (typeof DEMO_SPEECH_MODES)[number];

export interface IDemoSpeechScore {
  readonly mode: DemoSpeechMode;
  /**
   * 0..100, from the same scorer the course's speak stage uses. **Null when
   * nothing was spoken** — a typed sentence is checked, not pronounced.
   */
  readonly scorePercent: number | null;
  /** Exactly what the recogniser wrote down, echoed so the visitor can see it. */
  readonly transcript: string;
  /**
   * The single token that was scored. The recogniser hears the room, so the
   * target is located inside the transcript rather than the whole string being
   * compared — which is also what makes the sentence step possible at all.
   */
  readonly heard: string;
  /** Nothing was said, or nothing was heard. Scored 0, and never called wrong. */
  readonly isNotHeard: boolean;
  /**
   * No named error left, above the near-miss ceiling — the same test the
   * course's speak stage applies before it calls an attempt correct. It is here
   * so the demo cannot be kinder than the product it is advertising.
   */
  readonly isClean: boolean;
  readonly diagnoses: readonly IDemoSpeechDiagnosis[];
  /** Present in sentence mode, null in word mode. */
  readonly sentence: IDemoSentenceFindings | null;
}
