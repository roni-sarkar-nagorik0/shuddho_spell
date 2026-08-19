/** 002's `phonemes_type_check`. Three, and English has no fourth. */
export const PHONEME_TYPES = Object.freeze(['vowel', 'consonant', 'diphthong'] as const);

export type PhonemeType = (typeof PHONEME_TYPES)[number];
