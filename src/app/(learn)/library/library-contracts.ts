import { z } from 'zod';

/*
 * `.readonly()` on the arrays, so the inferred types are `readonly T[]` and
 * match the application DTOs the server hands in. Without it the server's
 * `readonly ILibraryWord[]` will not assign to a mutable `LibraryWord[]`, and
 * the fix would be a cast at the boundary — which is exactly the thing the
 * project bans.
 */

export const libraryWordSchema = z.object({
  id: z.string(),
  text: z.string(),
  ipa: z.string(),
  syllables: z.array(z.string()).readonly(),
  banglaSound: z.string(),
  banglaMeaning: z.string(),
  partOfSpeech: z.string(),
  weekIndex: z.number(),
  frequencyRank: z.number().nullable(),
  ruleFamilyCode: z.string().nullable(),
  accuracy: z.number().nullable(),
  timesSeen: z.number(),
  isMastered: z.boolean(),
});

export const libraryPageSchema = z.object({
  words: z.array(libraryWordSchema).readonly(),
  nextCursor: z.string().nullable(),
});

export type LibraryWord = z.infer<typeof libraryWordSchema>;
export type LibraryPage = z.infer<typeof libraryPageSchema>;

/** The columns a learner may hide. `text` is not among them — a table of anonymous rows. */
export const OPTIONAL_COLUMNS = Object.freeze([
  'ipa',
  'bangla',
  'meaning',
  'partOfSpeech',
  'week',
  'rule',
  'accuracy',
] as const);

export type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number];

export const COLUMN_LABELS: Readonly<Record<OptionalColumn, string>> = {
  ipa: 'IPA',
  bangla: 'Bangla sound',
  meaning: 'Meaning',
  partOfSpeech: 'Part of speech',
  week: 'Week',
  rule: 'Rule family',
  accuracy: 'Your accuracy',
};
