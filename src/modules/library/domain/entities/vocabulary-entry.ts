/**
 * One word and what it can be swapped for.
 *
 * The entity's job is the **pairing**, not the word: a `VocabularyEntry` is an
 * assertion that a candidate who wrote the headword could have written the
 * synonym and been marked higher for it. That is why the synonyms are ordered
 * rather than a set — the first one is the swap the product recommends, and a
 * drill that marked any of them correct would be marking the corpus rather than
 * the recommendation.
 *
 * There is no learner state here and no accuracy figure, for the same reason a
 * `WordFamily` carries none: this is a fact about English, not about a person.
 * `review_items` is keyed on the 3,000 programme words, and attaching a mastery
 * number to 777 words nobody has been asked would put an invented figure on the
 * screen.
 */
export class VocabularyEntry {
  private constructor(
    readonly word: string,
    readonly partOfSpeech: string,
    readonly synonyms: readonly string[],
    readonly topic: string,
  ) {}

  static create(input: {
    readonly word: string;
    readonly partOfSpeech: string;
    readonly synonyms: readonly string[];
    readonly topic: string;
  }): VocabularyEntry {
    return new VocabularyEntry(input.word, input.partOfSpeech, [...input.synonyms], input.topic);
  }

  /** The swap the product recommends — the one a drill marks correct. */
  get bestSynonym(): string {
    return this.synonyms[0] ?? this.word;
  }

  /**
   * Whether the headword is more than one word — `play down`, `hand out`.
   *
   * The screen needs it because a phrase cannot be spoken at the dictation rate
   * a single word is spoken at, and a drill needs it because a phrasal
   * headword and a single-word distractor are told apart by shape rather than
   * by meaning, which makes the question free.
   */
  get isPhrase(): boolean {
    return this.word.includes(' ');
  }

  /**
   * Whether the headword or any synonym begins with `prefix`.
   *
   * `startsWith`, not `includes`, and the same reasoning `WordFamily.matches`
   * gives: a learner types the beginning of the word they are looking for, and
   * substring matching would answer `act` with `contract` and `character`
   * before the word they meant.
   *
   * The synonyms are searched as well as the headword, because half the reason
   * to open this screen is having the *plain* word and wanting the better one —
   * and on a corpus filed under the better one, searching headwords alone
   * answers `huge` with nothing.
   */
  matches(prefix: string): boolean {
    const needle = prefix.trim().toLowerCase();

    if (needle === '') {
      return true;
    }

    return (
      this.word.startsWith(needle) ||
      this.synonyms.some((synonym) => synonym.startsWith(needle))
    );
  }
}
