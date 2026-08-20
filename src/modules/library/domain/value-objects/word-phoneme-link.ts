/**
 * One row of `word_phonemes`, as the domain sees it.
 *
 * A plain link rather than an entity: the join table carries no behaviour and
 * no invariant of its own beyond the ordering, and inventing a `WordPhoneme`
 * class would give three fields a constructor and nothing else.
 */
export interface IWordPhonemeLink {
  readonly wordId: string;
  readonly phonemeId: string;
  /** 0-based position within the word — 002's `word_phonemes.position`. */
  readonly position: number;
}
