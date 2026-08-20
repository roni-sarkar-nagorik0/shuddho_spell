/** 002's `words_part_of_speech_check`, in the order the constraint lists them. */
export const PARTS_OF_SPEECH = Object.freeze([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
] as const);

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];
