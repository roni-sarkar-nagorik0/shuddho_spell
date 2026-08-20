/** 002's `sentence_items_difficulty_check`. */
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard'] as const);

export type Difficulty = (typeof DIFFICULTIES)[number];
