/**
 * How a confusion deforms the word, which decides how it is *detected*.
 *
 * A substitution swaps one sound for another and shows up in the transcript as
 * a spelling shift. The other three do not: an epenthetic vowel adds a syllable
 * at the front, a dropped cluster shortens the end, and a stress error changes
 * nothing a recogniser writes down at all. Naming the kind is what lets one
 * detector per shape replace a pile of special cases — `07-speech-scoring.md`
 * is explicit that this map is data and never an `if` chain.
 */
export const CONFUSION_KINDS = Object.freeze([
  'substitution',
  'epenthesis',
  'cluster-drop',
  'stress',
] as const);

export type ConfusionKind = (typeof CONFUSION_KINDS)[number];
