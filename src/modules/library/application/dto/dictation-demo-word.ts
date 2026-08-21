/**
 * One word for the marketing page's dictation demo.
 *
 * **This shape carries the answer**, which nothing else in the product does.
 * `08-exam-engine.md` rule 3 — the answer key never leaves the server — is
 * about assessment, and a visitor with no account is not being assessed. They
 * are being shown what the exercise feels like, and the demo marks its own work
 * in the browser because there is no attempt row to mark it against. Every path
 * a *learner* takes still gets `IExamQuestionForLearner`, which has no `text`.
 */
/**
 * One sentence from the corpus that uses the demo's word.
 *
 * A word on its own is the hardest thing there is to hear and the least useful
 * thing to know — the demo's own audio doc says as much. This is the word put
 * back where it lives: the same English sentence the construction stage builds
 * in week one, with the Bangla prompt it was authored against.
 *
 * **Drawn from `sentence_items`, never composed.** A generated example would be
 * the one thing on this page nobody reviewed, and it would be sitting under a
 * claim about how English is spoken.
 */
export interface IDictationDemoSentence {
  readonly id: string;
  /** The English sentence. Contains the word as a whole word — that is how it was chosen. */
  readonly english: string;
  /** The Bangla it renders, so the meaning is not guessed from the shape. */
  readonly bangla: string;
}

export interface IDictationDemoWord {
  /**
   * The `words.id` this came from.
   *
   * The client posts it back when a signed-in learner answers, so the server
   * can look the word up and decide for itself whether they were right —
   * `Word.matches`, never the browser's opinion. A word id is not a secret;
   * the spelling is in the same payload.
   */
  readonly id: string;
  /** The spelling. The answer, and the demo needs it to grade itself. */
  readonly text: string;
  readonly ipa: string;
  /** Bangla-script approximation of the sound. */
  readonly banglaSound: string;
  readonly banglaMeaning: string;
  /**
   * One error a Bengali speaker actually makes on this word, from the corpus's
   * `commonMisspellings`. Null when the word has none recorded — better an
   * absent line than an invented mistake.
   */
  readonly commonError: string | null;
  /**
   * The word in use, or `null` when the corpus has no sentence containing it.
   *
   * Null is common and is not a failure: 560 sentences cannot cover 1,065
   * demonstrable words, and roughly **47%** of them appear in one. The use case
   * prefers a word that does — see the probe there — which lifts what a visitor
   * actually sees to about 19 in 20. The remaining one renders the four facts
   * and no sentence, rather than a sentence somebody made up to fill the row.
   */
  readonly sentence: IDictationDemoSentence | null;
  /*
   * There is no rule statement here any more.
   *
   * It used to carry one — `RuleFamily.statement`, the same sentence the lesson
   * shows — and on the demo panel it read as a paragraph of grammar terminology
   * under a word the visitor had just got wrong. The course is the place for
   * the rule, where a learner has met the vocabulary and has a reason to read
   * it. The front door has four seconds and needs four labelled facts.
   *
   * Dropping it also costs one query fewer per request.
   */
}
