import { z } from 'zod';

/**
 * The shape of the grammar course, and the rules that keep it teachable.
 *
 * `content/schema.ts` guards the spelling corpus; this guards the other kind of
 * content — prose a learner reads rather than data an engine consumes. The
 * failure modes are different, so the rules are too. A word with no IPA is
 * unusable and obvious. A grammar lesson with a heading and two lines under it
 * still *renders*, and the learner is the one who discovers it taught nothing.
 * The minimum lengths below are that discovery, moved to the build.
 *
 * Every rule here answers "what would make this lesson worthless":
 *
 * - an explanation shorter than a sentence is a definition, and the brief was
 *   explicitly the opposite — explain it as if to someone who has never met the
 *   idea before;
 * - a rule with no example is a claim;
 * - a lesson with no mistakes section teaches the rule and not the trap, and the
 *   traps are where a Bengali speaker's marks actually go;
 * - a lesson with nothing to attempt cannot build confidence, which is what the
 *   learner asked this course for.
 */

/** At least one Bangla codepoint — the Bengali block is U+0980..U+09FF. */
const BANGLA_SCRIPT = /[ঀ-৿]/u;

/**
 * Bangla, not transliteration — the same rule the corpus holds, for the same
 * reason: `bhalo` looks like content, passes every other check, and is
 * unreadable to the learner this product is for.
 */
const banglaText = (field: string): z.ZodType<string> =>
  z
    .string()
    .min(1)
    .refine((value) => BANGLA_SCRIPT.test(value), {
      message: `${field} must be written in Bangla script, not transliterated`,
    });

/**
 * One sentence that shows the rule working.
 *
 * `note` is what to look at. An example with no note is a sentence; an example
 * with one is a demonstration, and the difference is the whole lesson for a
 * learner who cannot yet see which part of the sentence is the point.
 */
export const grammarExampleSchema = z.object({
  english: z.string().min(4),
  note: z.string().min(4).optional(),
});

/**
 * A form table — the conjugations, the three forms of a tense, the columns of a
 * comparison. Optional per section, because most explanations are prose and a
 * table that exists to look thorough is noise.
 */
export const grammarTableSchema = z
  .object({
    caption: z.string().min(4),
    headers: z.array(z.string().min(1)).min(2),
    rows: z.array(z.array(z.string()).min(2)).min(2),
  })
  .refine((table) => table.rows.every((row) => row.length === table.headers.length), {
    message: 'every row must have exactly as many cells as there are headers',
    path: ['rows'],
  });

/**
 * One teaching block: a heading, the idea in plain words, the same idea in
 * Bangla, and sentences that show it.
 *
 * `bangla` is not a translation of `plain` and is not required to be. It is the
 * one line a learner falls back on when the English explanation did not land —
 * so it states the idea, not the paragraph.
 */
export const grammarSectionSchema = z.object({
  heading: z.string().min(3),
  plain: z.string().min(80),
  bangla: banglaText('bangla'),
  examples: z.array(grammarExampleSchema).min(2),
  table: grammarTableSchema.optional(),
});

/**
 * A mistake worth naming, with the correction and the reason.
 *
 * `why` is mandatory and it is the point. "Wrong: I am agree" teaches a learner
 * to avoid four words. "Because *agree* is already a verb — it does not need
 * *am*" teaches them the shape, and the shape is what transfers to *I am
 * disagree*, *I am belong*, and the twenty others.
 */
export const grammarMistakeSchema = z.object({
  wrong: z.string().min(3),
  right: z.string().min(3),
  why: z.string().min(20),
});

/** Something to attempt, the answer, and why that is the answer. */
export const grammarCheckSchema = z.object({
  prompt: z.string().min(6),
  answer: z.string().min(1),
  why: z.string().min(15),
});

export const GRAMMAR_LEVELS = ['basic', 'building', 'strong', 'advanced'] as const;

export const grammarDaySchema = z.object({
  dayIndex: z.number().int().min(1).max(28),
  title: z.string().min(4),
  banglaTitle: banglaText('banglaTitle'),
  /** What the learner can do at the end of it. One line, second person. */
  goal: z.string().min(30),
  /** Where this shows up in the exam. Named parts and tasks, not "it is important". */
  ieltsWhy: z.string().min(60),
  minutes: z.number().int().min(10).max(45),
  sections: z.array(grammarSectionSchema).min(3),
  mistakes: z.array(grammarMistakeSchema).min(3),
  /** Sentence frames to carry into the exam — the reason this is an IELTS course. */
  ieltsMoves: z.array(z.string().min(10)).min(3),
  checks: z.array(grammarCheckSchema).min(3),
});

export type GrammarExampleEntry = z.infer<typeof grammarExampleSchema>;
export type GrammarTableEntry = z.infer<typeof grammarTableSchema>;
export type GrammarSectionEntry = z.infer<typeof grammarSectionSchema>;
export type GrammarMistakeEntry = z.infer<typeof grammarMistakeSchema>;
export type GrammarCheckEntry = z.infer<typeof grammarCheckSchema>;
export type GrammarDayEntry = z.infer<typeof grammarDaySchema>;
export type GrammarLevel = (typeof GRAMMAR_LEVELS)[number];
