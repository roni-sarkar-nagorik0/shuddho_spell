import { z } from 'zod';

/*
 * `.readonly()` on every array so the inferred types are `readonly T[]` and
 * assign straight from the application DTOs the server render hands in.
 */

export const verbDrillQuestionSchema = z.object({
  base: z.string(),
  target: z.string(),
  targetName: z.string(),
  options: z.array(z.string()).readonly(),
  answerIndex: z.number(),
  rule: z.string(),
  forms: z.array(z.string()).readonly(),
  banglaMeaning: z.string().nullable(),
  isIrregular: z.boolean(),
});

export const verbDrillSchema = z.object({
  questions: z.array(verbDrillQuestionSchema).readonly(),
  totalVerbs: z.number(),
});

const verbFormSchema = z.object({ form: z.string(), rule: z.string() });

export const verbSchema = z.object({
  base: z.string(),
  past: verbFormSchema,
  participle: verbFormSchema,
  presentParticiple: verbFormSchema,
  thirdPerson: verbFormSchema,
  isIrregular: z.boolean(),
  isCore: z.boolean(),
  distinctForms: z.number(),
  banglaMeaning: z.string().nullable(),
  sense: z.string().nullable(),
  inCourse: z.boolean(),
});

export const verbPageSchema = z.object({
  verbs: z.array(verbSchema).readonly(),
  nextCursor: z.string().nullable(),
  matchedVerbs: z.number(),
  totalVerbs: z.number(),
  irregularVerbs: z.number(),
  coreVerbs: z.number(),
  withBangla: z.number(),
  letters: z.array(z.object({ label: z.string(), verbs: z.number() })).readonly(),
});

export type VerbDrillQuestion = z.infer<typeof verbDrillQuestionSchema>;
export type VerbDrill = z.infer<typeof verbDrillSchema>;
export type VerbView = z.infer<typeof verbSchema>;
export type VerbPage = z.infer<typeof verbPageSchema>;

/**
 * A rule name, in a sentence a learner can act on.
 *
 * The names arrive from the domain as short keys — `drop-e`, `double` — because
 * a column of sentences would be the widest thing in a five-column table. This
 * is where each one becomes the thing worth reading, and it is deliberately
 * phrased as *what to do*, not as what happened: a learner meets the next verb
 * before they meet this screen again.
 *
 * The fallback is the key itself rather than a blank. A rule this map has not
 * caught up with is a bug worth seeing, not one worth hiding.
 */
export function ruleSentence(rule: string): string {
  const sentences: Readonly<Record<string, string>> = {
    add: 'Nothing changes in the stem — just add the ending.',
    'drop-e': 'The silent e goes before the ending.',
    double: 'One syllable, consonant–vowel–consonant, so the last letter doubles.',
    'y-to-i': 'A consonant before the y, so the y becomes an i.',
    'ie-to-y': 'The -ie becomes a y before -ing.',
    'add-es': 'It ends in a hissing sound, so the ending is -es rather than -s.',
    irregular: 'No rule reaches this one. It has to be remembered.',
  };

  return sentences[rule] ?? rule;
}

/** The five columns, in the order every verb table in the world prints them. */
export const FORM_COLUMNS = Object.freeze([
  { key: 'V1', name: 'base' },
  { key: 'V2', name: 'past' },
  { key: 'V3', name: 'past participle' },
  { key: 'V4', name: '-ing' },
  { key: 'V5', name: 'he/she/it' },
] as const);
