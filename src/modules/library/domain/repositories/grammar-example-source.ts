/**
 * One sentence from a grammar lesson, offered to whatever needs to show a word
 * being used.
 *
 * **Why a second source at all.** `sentence_items` is the construction stage's
 * material and it is short on purpose — a learner builds those from a word
 * bank, so they are four words at the median and nine at the very longest. Four
 * words is barely a context: it is enough to show the word has a job and not
 * enough to show English doing anything. The grammar lessons' examples run to a
 * median of **seven** and a maximum of fifteen, and they are the same reviewed
 * content the course teaches from.
 *
 * `bangla` is deliberately absent from this shape. A grammar example has no
 * Bangla rendering — it was authored to demonstrate a rule to a reader who is
 * already inside the lesson — and inventing one to match the corpus's shape is
 * the one thing this must not do. What it has instead is `note`, the lesson's
 * own "what to look at", which is the nearest honest equivalent.
 */
export interface IGrammarExample {
  /** `day-12-3` — the day and the section it came from. Stable, and not a database id. */
  readonly id: string;
  readonly english: string;
  /** What the lesson says to notice about it. Null on the entries with no note. */
  readonly note: string | null;
  /** Which of the 28 days it is taught on. */
  readonly dayIndex: number;
}

export const GRAMMAR_EXAMPLE_SOURCE = Symbol('GRAMMAR_EXAMPLE_SOURCE');

export interface IGrammarExampleSource {
  /**
   * Every example that uses `word` as a whole word.
   *
   * Unlike the corpus this needs no cap and no pattern: the examples are a
   * compiled module rather than a table, so the search is a scan of 313 strings
   * already in memory and costs no round trip at all.
   */
  readonly findUsing: (word: string) => Promise<readonly IGrammarExample[]>;
}
