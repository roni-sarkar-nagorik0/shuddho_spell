/**
 * How an answer was given — 003's `attempts_mode_check`.
 *
 * The mode is not cosmetic: it decides what a wrong answer means. The same word
 * missed in `dictation` is a spelling gap and in `pronunciation` is a phoneme
 * gap, and the mastery matrix routes them to different dimensions.
 */
export const ATTEMPT_MODES = Object.freeze([
  'dictation',
  'pronunciation',
  'construction',
] as const);

export type AttemptMode = (typeof ATTEMPT_MODES)[number];
