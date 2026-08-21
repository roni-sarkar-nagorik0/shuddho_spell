/**
 * One word a learner met today, and how it went.
 *
 * `tries` is every submission for that word; the word itself is counted once,
 * which is the distinction the dashboard is built on — "how many words did I
 * work on" and "how much work did I do" are different questions and a single
 * number answers neither.
 */
export interface IPractisedWord {
  readonly wordId: string;
  readonly text: string;
  readonly ipa: string;
  /** Bangla-script approximation, so the list reads as the lesson does. */
  readonly banglaSound: string;
  readonly tries: number;
  /** True once it has been spelled correctly at least once today. */
  readonly settled: boolean;
}

export interface IPractiseTally {
  /** Distinct words. A word tried six times is one word. */
  readonly distinctWords: number;
  /** Every submission. This is the six. */
  readonly tries: number;
  readonly settled: number;
  readonly words: readonly IPractisedWord[];
}

/**
 * What the dashboard's practice panel shows.
 *
 * **Two tallies, never one.** The course and the landing-page demo are counted
 * apart because they are not the same activity: a lesson attempt is scored,
 * scheduled for review and rolled into mastery, while a demo attempt is a
 * visitor pressing *Next word*. Adding them would let forty presses at the
 * front door report a day's learning that did not happen, and a learner
 * checking their own progress is exactly the person that number must not lie
 * to.
 */
export interface IWordsPractised {
  /** The learner-local calendar day these tallies cover, `YYYY-MM-DD`. */
  readonly date: string;
  readonly course: IPractiseTally;
  readonly demo: IPractiseTally;
}
