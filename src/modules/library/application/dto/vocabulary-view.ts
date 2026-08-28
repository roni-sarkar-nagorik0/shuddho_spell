/** One pair, ready to render. */
export interface IVocabularyEntryView {
  readonly word: string;
  readonly partOfSpeech: string;
  readonly topic: string;
  /** Best first — the swap the card prints beside the headword. */
  readonly synonyms: readonly string[];
  /**
   * Whether this exact word is one of the 3,000 the course teaches.
   *
   * The one bridge between the two corpora, and it exists for the reason the
   * families screen's `inCourse` does: a learner who meets `abundant` here can
   * be told it is a word they will be drilled on, rather than being left to
   * wonder whether the reference and the course are the same product.
   */
  readonly inCourse: boolean;
  /** `play down`, `hand out` — spoken and laid out differently from one word. */
  readonly isPhrase: boolean;
}

/** One row of the topic index down the side of the screen. */
export interface IVocabularyTopicTally {
  readonly topic: string;
  readonly entries: number;
}

/** One row of the part-of-speech filter. */
export interface IVocabularyPosTally {
  readonly partOfSpeech: string;
  readonly entries: number;
}

export interface IVocabularyPage {
  readonly entries: readonly IVocabularyEntryView[];
  /** The headword to pass as `after` for the next page, or null at the end. */
  readonly nextCursor: string | null;
  /** How many entries the filters matched, before paging. */
  readonly matchedEntries: number;
  /** The whole corpus, unfiltered — the number the screen promises. */
  readonly totalEntries: number;
  /** Distinct synonyms across the whole corpus. */
  readonly totalSynonyms: number;
  readonly topics: readonly IVocabularyTopicTally[];
  readonly partsOfSpeech: readonly IVocabularyPosTally[];
}
