import { normaliseAnswer } from '@/modules/shared/domain/text/normalise-answer';
import { type Difficulty } from '../value-objects/difficulty';

/** Terminal punctuation carries no grammar the construction stage is testing. */
const TERMINAL_PUNCTUATION = /[.!?]+$/u;

/**
 * A Bangla prompt and the English sentence it asks for.
 *
 * `acceptedAlternatives` is what keeps the construction stage honest. English
 * usually has more than one correct rendering of a Bangla sentence, and a
 * single hard-coded target would mark a correct learner wrong — the fastest way
 * to lose trust in a language product.
 */
export class SentenceItem {
  constructor(
    readonly id: string,
    readonly banglaText: string,
    readonly englishText: string,
    /** Empty means the target really is the only correct answer. */
    readonly acceptedAlternatives: readonly string[],
    /** Wrong words mixed into the word bank the learner builds from. */
    readonly distractorWords: readonly string[],
    readonly grammarRuleFamilyIds: readonly string[],
    readonly difficulty: Difficulty,
  ) {}

  /**
   * Whether a constructed sentence is correct — the target or any recorded
   * alternative, compared without case, spacing or a final full stop.
   *
   * Punctuation is forgiven because the word-bank UI does not offer it; a
   * learner cannot type the full stop this would otherwise demand.
   */
  accepts(candidate: string): boolean {
    const normalised = this.normalise(candidate);

    return [this.englishText, ...this.acceptedAlternatives].some(
      (accepted) => this.normalise(accepted) === normalised,
    );
  }

  /**
   * Whether this sentence uses `word` as a **whole word**.
   *
   * The reason it is here and not in a `filter` beside the query: the only
   * thing Postgres can be asked for is `english_text ilike '%hand%'`, and that
   * also returns *handle*, *shorthand* and *beforehand*. Showing a learner who
   * just spelled "hand" a sentence about a *handle* would be teaching them the
   * wrong word — so the pattern narrows the rows and this decides.
   *
   * Boundaries are the ASCII letters and the apostrophe, so "don't" is one word
   * rather than two, and `t` does not match inside it.
   */
  contains(word: string): boolean {
    const target = normaliseAnswer(word);

    if (target === '') {
      return false;
    }

    return this.words().includes(target);
  }

  /**
   * The sentence as a list of whole words, lower-cased, punctuation dropped.
   * The same split `contains` asks and the demo highlights with, so the two can
   * never disagree about where a word begins.
   */
  words(): readonly string[] {
    return normaliseAnswer(this.englishText)
      .split(/[^a-z\u0027]+/u)
      .filter((token) => token !== '');
  }

  private normalise(value: string): string {
    return normaliseAnswer(value).replace(TERMINAL_PUNCTUATION, '');
  }
}
