import { z } from 'zod';

/*
 * `.readonly()` on every array, so the inferred types are `readonly T[]` and
 * assign from the application DTOs the server render hands in. Without it the
 * fix at the boundary would be a cast, which is the thing this project bans.
 */

export const formChangeSchema = z.object({
  kind: z.string(),
  prefix: z.string().nullable(),
  suffix: z.string().nullable(),
  reversesMeaning: z.boolean(),
});

export const familyMemberSchema = z.object({
  text: z.string(),
  partOfSpeech: z.string(),
  change: formChangeSchema,
  inCourse: z.boolean(),
});

export const wordFamilySchema = z.object({
  root: z.string(),
  banglaMeaning: z.string(),
  topic: z.string(),
  skills: z.array(z.string()).readonly(),
  ruleFamilyCode: z.string().nullable(),
  ruleStatement: z.string().nullable(),
  members: z.array(familyMemberSchema).readonly(),
  inCourseCount: z.number(),
});

export const wordFamilyPageSchema = z.object({
  families: z.array(wordFamilySchema).readonly(),
  nextCursor: z.string().nullable(),
  matchedFamilies: z.number(),
  matchedWords: z.number(),
  totalWords: z.number(),
  totalFamilies: z.number(),
  topics: z
    .array(z.object({ topic: z.string(), families: z.number(), words: z.number() }))
    .readonly(),
  rules: z
    .array(
      z.object({
        code: z.string(),
        statement: z.string(),
        families: z.number(),
        words: z.number(),
      }),
    )
    .readonly(),
});

export type FormChange = z.infer<typeof formChangeSchema>;
export type FamilyMember = z.infer<typeof familyMemberSchema>;
export type WordFamilyView = z.infer<typeof wordFamilySchema>;
export type WordFamilyPage = z.infer<typeof wordFamilyPageSchema>;

/** The four papers, in the order the test is sat. */
export const SKILLS = Object.freeze(['listening', 'reading', 'writing', 'speaking'] as const);

export type Skill = (typeof SKILLS)[number];

/**
 * How a change is written on screen.
 *
 * `−e` and `y→i` rather than the words "drop the silent e" and "y becomes i",
 * because these sit in a column beside 2,299 words and the sentence version
 * would be the widest thing on the page. The sentence is on the card once, at
 * the top, where the rule is stated in full.
 */
export function changeLabel(change: FormChange): string {
  const stem =
    change.kind === 'doubled'
      ? 'double'
      : change.kind === 'y-to-i'
        ? 'y→i'
        : change.kind === 'drop-e'
          ? '−e'
          : null;

  const prefix = change.prefix === null ? null : `${change.prefix}-`;
  const suffix = change.suffix === null || change.suffix === '' ? null : `-${change.suffix}`;

  if (change.kind === 'irregular') {
    return prefix ?? 'irregular';
  }

  return [prefix, stem, suffix].filter((part) => part !== null).join(' ') || 'same';
}
