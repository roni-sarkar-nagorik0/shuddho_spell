/** One row of the library table. */
export interface ILibraryWord {
  readonly id: string;
  readonly text: string;
  readonly ipa: string;
  readonly syllables: readonly string[];
  readonly banglaSound: string;
  readonly banglaMeaning: string;
  readonly partOfSpeech: string;
  readonly weekIndex: number;
  readonly frequencyRank: number | null;
  readonly ruleFamilyCode: string | null;
  /**
   * The learner's own record for this word, from `review_items`. `null` when
   * they have never got it wrong — which is not the same as never having seen
   * it, and the screen says so.
   */
  readonly accuracy: number | null;
  readonly timesSeen: number;
  readonly isMastered: boolean;
}

export interface ILibraryPage {
  readonly words: readonly ILibraryWord[];
  /**
   * The `text` to pass as `after` for the next page, or `null` at the end.
   *
   * A keyset cursor, not an offset: `08-exam-engine.md` and
   * `11-api-surface.md` both call for cursors, and the reason is that the
   * content pipeline can seed a word alphabetically behind a reader, which an
   * offset would turn into a repeated or skipped row.
   */
  readonly nextCursor: string | null;
}
