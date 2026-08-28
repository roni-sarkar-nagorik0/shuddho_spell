/**
 * One question: a word, four candidate meanings, and which one is right.
 *
 * `answerIndex` is on the DTO, which means the answer travels to the browser
 * with the question. That is deliberate and it is the difference between this
 * and the exam engine: `06-exam-engine.md` is server-authoritative because a
 * mark is at stake, and nothing is at stake here. This drill scores nothing,
 * stores nothing and appears on the marketing page and the dashboard, where a
 * round trip per tap would make it feel broken. A visitor who reads the answer
 * out of the network tab has cheated at a demonstration.
 */
export interface IVocabularyDrillQuestion {
  readonly word: string;
  readonly partOfSpeech: string;
  readonly topic: string;
  /** Four, shuffled — the right answer and three from elsewhere in the corpus. */
  readonly options: readonly string[];
  readonly answerIndex: number;
  /** Every equivalent the corpus holds, shown once the question is answered. */
  readonly synonyms: readonly string[];
  readonly inCourse: boolean;
}

export interface IVocabularyDrill {
  readonly questions: readonly IVocabularyDrillQuestion[];
  /** The corpus this was drawn from — the claim the screen makes beside it. */
  readonly totalEntries: number;
}
