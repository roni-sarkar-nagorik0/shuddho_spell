/** One 22px cell of a `PhonemeStrip`, with the learner's own mastery of that sound. */
export interface IPhonemeStripCell {
  readonly symbol: string;
  readonly isStressed: boolean;
  /** `null` when the symbol resolves to no phoneme in the inventory of 44. */
  readonly phonemeId: string | null;
  /** The learner's accuracy for this sound, 0..1, or `null` for never attempted. */
  readonly accuracy: number | null;
  readonly attempts: number;
}

export interface IWordPhonemeStrip {
  readonly wordId: string;
  readonly text: string;
  readonly ipa: string;
  readonly syllables: readonly string[];
  readonly banglaSound: string;
  readonly cells: readonly IPhonemeStripCell[];
}
