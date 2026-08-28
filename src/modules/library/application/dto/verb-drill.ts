/**
 * One question: a verb, the form being asked for, and four candidates.
 *
 * `answerIndex` travels with the question, exactly as it does in the vocabulary
 * drill and for the same reason — nothing is marked, stored, or scored, so
 * there is nothing for a server to be authoritative about. The exam engine is
 * the place where that reasoning runs the other way.
 */
export interface IVerbDrillQuestion {
  readonly base: string;
  /** `V2`, `V3`, `V4` or `V5` — printed as the question. */
  readonly target: string;
  /** What that form is called in English, for the learner who does not know. */
  readonly targetName: string;
  readonly options: readonly string[];
  readonly answerIndex: number;
  /**
   * The rule behind the right answer, shown after the tap.
   *
   * This is the whole reason the drill exists rather than a flashcard: getting
   * `stopping` right is worth one mark, and being told *the p doubles because
   * stop is one syllable ending consonant-vowel-consonant* is worth every verb
   * shaped like it.
   */
  readonly rule: string;
  /** All five forms, revealed once the question is answered. */
  readonly forms: readonly string[];
  readonly banglaMeaning: string | null;
  readonly isIrregular: boolean;
}

export interface IVerbDrill {
  readonly questions: readonly IVerbDrillQuestion[];
  /** The corpus this was drawn from — the claim the screen makes beside it. */
  readonly totalVerbs: number;
}
