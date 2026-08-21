import { type z } from 'zod';
import {
  examDefinitionSchema,
  phonemeSchema,
  ruleFamilySchema,
  weekSchema,
  type ExamDefinitionEntry,
  type PhonemeEntry,
  type RuleFamilyEntry,
  type WeekEntry,
} from './schema';

/**
 * The checks a single entry cannot make about itself.
 *
 * Everything in `schema.ts` is local: this word's misspellings, this sentence's
 * alternatives. The rules here are **cross-file** — a phoneme id referenced by
 * a word in another file, a duplicate `text` across two weeks, a day whose word
 * list names something the week does not contain. Those are exactly the errors
 * that survive a per-file validator and surface as a missing lesson item three
 * months later.
 */

export interface IValidationIssue {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export interface IContentCounts {
  readonly words: number;
  readonly sentenceItems: number;
  readonly phonemes: number;
  readonly ruleFamilies: number;
  readonly days: number;
  readonly exams: number;
  readonly ipaNeedsReview: readonly string[];
  readonly phonemesNeedReview: readonly string[];
}

export interface IValidationResult {
  readonly issues: readonly IValidationIssue[];
  readonly counts: IContentCounts;
}

/**
 * Roughly how long one item takes.
 *
 * Corrected from a first guess of 45 and 75, which made an honest day — the
 * 1,240 words and 560 sentences of the spec, divided by 28 — claim 58 minutes.
 * `learner_profiles.daily_minutes` defaults to 30 and `00-overview.md` sells a
 * fifteen-to-thirty-minute habit, so either the numbers or the promise had to
 * give. These are the interaction times: hear a word, type it, read the
 * feedback; read a Bangla prompt, build a sentence, read the feedback.
 */
const SECONDS_PER_WORD = 25;
const SECONDS_PER_SENTENCE = 45;
const SECONDS_PER_MINUTE = 60;
/** A day may claim within this factor of what its content actually takes. */
const MINUTES_TOLERANCE = 1.5;

/** `08-exam-engine.md`'s five, and 004's `exam_definitions_code_check`. */
const REQUIRED_EXAM_CODES: readonly ExamDefinitionEntry['code'][] = [
  'diagnostic',
  'milestone1',
  'milestone2',
  'milestone3',
  'final',
];

function fromZod(file: string, error: z.ZodError): readonly IValidationIssue[] {
  return error.issues.map((issue) => ({
    file,
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validateContent(input: {
  readonly phonemes: readonly unknown[];
  readonly ruleFamilies: readonly unknown[];
  readonly weeks: readonly unknown[];
  readonly exams: readonly unknown[];
}): IValidationResult {
  const issues: IValidationIssue[] = [];

  const phonemes: PhonemeEntry[] = [];
  const ruleFamilies: RuleFamilyEntry[] = [];
  const weeks: WeekEntry[] = [];
  const exams: ExamDefinitionEntry[] = [];

  input.phonemes.forEach((entry, index) => {
    const parsed = phonemeSchema.safeParse(entry);

    if (parsed.success) {
      phonemes.push(parsed.data);
    } else {
      issues.push(...fromZod(`content/phonemes.ts[${String(index)}]`, parsed.error));
    }
  });

  input.ruleFamilies.forEach((entry, index) => {
    const parsed = ruleFamilySchema.safeParse(entry);

    if (parsed.success) {
      ruleFamilies.push(parsed.data);
    } else {
      issues.push(...fromZod(`content/rule-families.ts[${String(index)}]`, parsed.error));
    }
  });

  input.weeks.forEach((entry, index) => {
    const parsed = weekSchema.safeParse(entry);

    if (parsed.success) {
      weeks.push(parsed.data);
    } else {
      issues.push(...fromZod(`content/week-0${String(index + 1)}.ts`, parsed.error));
    }
  });

  input.exams.forEach((entry, index) => {
    const parsed = examDefinitionSchema.safeParse(entry);

    if (parsed.success) {
      exams.push(parsed.data);
    } else {
      issues.push(...fromZod(`content/exams.ts[${String(index)}]`, parsed.error));
    }
  });

  // Five codes, each once. 004's unique index would catch the duplicate at seed
  // time, but a missing code is the failure that matters and no constraint can
  // see it: the onboarding wizard sends every new learner to `/exams/diagnostic`
  // and a catalogue without that row answers 404.
  const examCodes = new Set(exams.map((exam) => exam.code));

  for (const code of REQUIRED_EXAM_CODES) {
    if (!examCodes.has(code)) {
      issues.push({
        file: 'content/exams.ts',
        path: 'exams',
        message: `no definition for "${code}" — 08-exam-engine.md names five exams and every one is reachable from the app`,
      });
    }
  }

  if (examCodes.size !== exams.length) {
    issues.push({
      file: 'content/exams.ts',
      path: 'exams',
      message: 'two definitions share a code',
    });
  }

  const ruleCodes = new Set(ruleFamilies.map((family) => family.code));
  const seenWords = new Map<string, number>();
  const seenSentences = new Map<string, number>();
  const ipaNeedsReview: string[] = [];
  const phonemesNeedReview = phonemes
    .filter((phoneme) => phoneme.needsReview)
    .map((phoneme) => phoneme.symbol);

  let dayCount = 0;

  for (const week of weeks) {
    const file = `content/week-0${String(week.weekIndex)}.ts`;
    const wordTexts = new Set(week.words.map((word) => word.text));
    const sentenceTexts = new Set(week.sentenceItems.map((item) => item.englishText));

    for (const word of week.words) {
      // A word taught twice is a learner being told something is new when it is
      // not, and two `words` rows with the same `text` violate 002's unique
      // index — so this is a build failure rather than a seed failure.
      const first = seenWords.get(word.text);

      if (first !== undefined) {
        issues.push({
          file,
          path: `words.${word.text}`,
          message: `duplicate word — already defined in week ${String(first)}`,
        });
      }

      seenWords.set(word.text, week.weekIndex);

      if (word.ruleFamily !== null && !ruleCodes.has(word.ruleFamily)) {
        issues.push({
          file,
          path: `words.${word.text}.ruleFamily`,
          message: `unknown rule family "${word.ruleFamily}"`,
        });
      }

      if (word.ipaNeedsReview) {
        ipaNeedsReview.push(`${word.text} /${word.ipa}/`);
      }
    }

    for (const item of week.sentenceItems) {
      const first = seenSentences.get(item.englishText);

      if (first !== undefined) {
        issues.push({
          file,
          path: `sentenceItems.${item.englishText}`,
          message: `duplicate sentence — already defined in week ${String(first)}`,
        });
      }

      seenSentences.set(item.englishText, week.weekIndex);

      for (const code of item.grammarRuleCodes) {
        if (!ruleCodes.has(code)) {
          issues.push({
            file,
            path: `sentenceItems.${item.englishText}.grammarRuleCodes`,
            message: `unknown rule family "${code}"`,
          });
        }
      }

      // A distractor that is a word of the answer makes the word bank a lie:
      // the learner picks it because it is correct and is marked wrong.
      const answerWords = new Set(item.englishText.toLowerCase().replaceAll(/[.,!?]/gu, '').split(' '));

      for (const distractor of item.distractorWords) {
        if (answerWords.has(distractor.toLowerCase())) {
          issues.push({
            file,
            path: `sentenceItems.${item.englishText}.distractorWords`,
            message: `"${distractor}" appears in the answer, so it is not a distractor`,
          });
        }
      }
    }

    for (const day of week.days) {
      dayCount += 1;

      for (const text of day.wordTexts) {
        if (!wordTexts.has(text)) {
          issues.push({
            file,
            path: `days.${String(day.dayIndex)}.wordTexts`,
            message: `day ${String(day.dayIndex)} names "${text}", which week ${String(week.weekIndex)} does not define`,
          });
        }
      }

      for (const text of day.sentenceTexts) {
        if (!sentenceTexts.has(text)) {
          issues.push({
            file,
            path: `days.${String(day.dayIndex)}.sentenceTexts`,
            message: `day ${String(day.dayIndex)} names a sentence week ${String(week.weekIndex)} does not define`,
          });
        }
      }

      for (const code of day.ruleFamilyCodes) {
        if (!ruleCodes.has(code)) {
          issues.push({
            file,
            path: `days.${String(day.dayIndex)}.ruleFamilyCodes`,
            message: `unknown rule family "${code}"`,
          });
        }
      }

      // The promise the streak is built on. A day claiming thirty minutes and
      // holding seventy costs the learner the streak they were told they could
      // keep.
      const seconds =
        day.wordTexts.length * SECONDS_PER_WORD + day.sentenceTexts.length * SECONDS_PER_SENTENCE;
      const actualMinutes = seconds / SECONDS_PER_MINUTE;

      if (
        actualMinutes > day.estimatedMinutes * MINUTES_TOLERANCE ||
        actualMinutes * MINUTES_TOLERANCE < day.estimatedMinutes
      ) {
        issues.push({
          file,
          path: `days.${String(day.dayIndex)}.estimatedMinutes`,
          message: `claims ${String(day.estimatedMinutes)} minutes but its ${String(day.wordTexts.length)} words and ${String(day.sentenceTexts.length)} sentences take about ${String(Math.round(actualMinutes))}`,
        });
      }
    }
  }

  return {
    issues,
    counts: {
      words: seenWords.size,
      sentenceItems: seenSentences.size,
      phonemes: phonemes.length,
      ruleFamilies: ruleFamilies.length,
      days: dayCount,
      exams: exams.length,
      ipaNeedsReview,
      phonemesNeedReview,
    },
  };
}
