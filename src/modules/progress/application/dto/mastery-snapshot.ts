/** One cell of the mastery matrix. */
export interface IMasteryCell {
  readonly dimensionId: string;
  /** The IPA symbol, or the rule family's code. What the learner recognises. */
  readonly label: string;
  readonly attempts: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly isWeakness: boolean;
}

/**
 * The two axes, kept apart.
 *
 * Merging them into one list would need a `dimension` discriminator on every
 * cell and a client that switches on it — and the screens are different anyway:
 * sounds are drilled with pronunciation, rules with spelling.
 */
export interface IMasterySnapshot {
  readonly phonemes: readonly IMasteryCell[];
  readonly ruleFamilies: readonly IMasteryCell[];
  /** Weakest first, across both axes — what to work on, not what to browse. */
  readonly weaknesses: readonly IMasteryCell[];
}
