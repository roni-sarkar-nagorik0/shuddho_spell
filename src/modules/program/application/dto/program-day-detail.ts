/** A word as the lesson needs it — everything to show, hear and spell it. */
export interface IProgramWord {
  readonly id: string;
  readonly text: string;
  readonly ipa: string;
  readonly syllables: readonly string[];
  readonly banglaSound: string;
  readonly banglaMeaning: string;
  readonly partOfSpeech: string;
}

export interface IProgramSentence {
  readonly id: string;
  readonly banglaText: string;
  readonly englishText: string;
  readonly distractorWords: readonly string[];
  readonly difficulty: string;
}

export interface IProgramRule {
  readonly id: string;
  readonly code: string;
  readonly statement: string;
  readonly examples: readonly string[];
  readonly counterexamples: readonly string[];
}

/**
 * One day, resolved.
 *
 * Note what is **not** here: `acceptedAlternatives` and `commonMisspellings`.
 * Both are answer keys. Shipping them to the browser would let a learner read
 * the accepted answers out of a network tab, which is the same class of mistake
 * as `correct_answer` in an exam response — and `08-exam-engine.md` treats that
 * one as a correctness bug rather than a leak of convenience.
 */
export interface IProgramDayDetail {
  readonly dayIndex: number;
  readonly weekIndex: number;
  readonly title: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly words: readonly IProgramWord[];
  readonly sentences: readonly IProgramSentence[];
  readonly rules: readonly IProgramRule[];
}
