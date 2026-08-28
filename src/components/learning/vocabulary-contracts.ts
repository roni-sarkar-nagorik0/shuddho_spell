import { z } from 'zod';

/*
 * `.readonly()` on every array so the inferred types are `readonly T[]` and
 * assign straight from the application DTOs the server render hands in.
 * Without it the fix at the boundary would be a cast, which is the thing this
 * project bans.
 */

export const vocabularyDrillQuestionSchema = z.object({
  word: z.string(),
  partOfSpeech: z.string(),
  topic: z.string(),
  options: z.array(z.string()).readonly(),
  answerIndex: z.number(),
  synonyms: z.array(z.string()).readonly(),
  inCourse: z.boolean(),
});

export const vocabularyDrillSchema = z.object({
  questions: z.array(vocabularyDrillQuestionSchema).readonly(),
  totalEntries: z.number(),
});

export const vocabularyEntrySchema = z.object({
  word: z.string(),
  partOfSpeech: z.string(),
  topic: z.string(),
  synonyms: z.array(z.string()).readonly(),
  inCourse: z.boolean(),
  isPhrase: z.boolean(),
});

export const vocabularyPageSchema = z.object({
  entries: z.array(vocabularyEntrySchema).readonly(),
  nextCursor: z.string().nullable(),
  matchedEntries: z.number(),
  totalEntries: z.number(),
  totalSynonyms: z.number(),
  topics: z.array(z.object({ topic: z.string(), entries: z.number() })).readonly(),
  partsOfSpeech: z
    .array(z.object({ partOfSpeech: z.string(), entries: z.number() }))
    .readonly(),
});

export type VocabularyDrillQuestion = z.infer<typeof vocabularyDrillQuestionSchema>;
export type VocabularyDrill = z.infer<typeof vocabularyDrillSchema>;
export type VocabularyEntryView = z.infer<typeof vocabularyEntrySchema>;
export type VocabularyPage = z.infer<typeof vocabularyPageSchema>;

/**
 * The short tag printed beside a word.
 *
 * `adj` rather than `adjective`, because this sits in a row with the topic and
 * the course badge and the full word is the widest thing in a line that is
 * mostly not the point. The mapping is exhaustive over what the corpus holds,
 * and anything unexpected falls through to itself rather than to a blank.
 */
export function shortPos(partOfSpeech: string): string {
  const short: Readonly<Record<string, string>> = {
    noun: 'n.',
    verb: 'v.',
    adjective: 'adj.',
    adverb: 'adv.',
  };

  return short[partOfSpeech] ?? partOfSpeech;
}
