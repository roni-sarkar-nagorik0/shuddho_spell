import { GRAMMAR_DAYS_01_07 } from './days-01-07';
import { GRAMMAR_DAYS_08_14 } from './days-08-14';
import { GRAMMAR_DAYS_15_21 } from './days-15-21';
import { GRAMMAR_DAYS_22_28 } from './days-22-28';
import { grammarDaySchema, type GrammarDayEntry } from './schema';

/** The course, in order. Twenty-eight days, four files of seven. */
export const GRAMMAR_DAYS: readonly GrammarDayEntry[] = [
  ...GRAMMAR_DAYS_01_07,
  ...GRAMMAR_DAYS_08_14,
  ...GRAMMAR_DAYS_15_21,
  ...GRAMMAR_DAYS_22_28,
];

export const GRAMMAR_COURSE_LENGTH = 28;

export interface IGrammarIssue {
  readonly file: string;
  readonly path: string;
  readonly message: string;
}

export interface IGrammarCounts {
  readonly days: number;
  readonly sections: number;
  readonly examples: number;
  readonly mistakes: number;
  readonly checks: number;
  readonly minutes: number;
}

export interface IGrammarValidation {
  readonly issues: readonly IGrammarIssue[];
  readonly counts: IGrammarCounts;
}

function fileFor(dayIndex: number): string {
  if (dayIndex <= 7) {
    return 'content/grammar/days-01-07.ts';
  }
  if (dayIndex <= 14) {
    return 'content/grammar/days-08-14.ts';
  }
  if (dayIndex <= 21) {
    return 'content/grammar/days-15-21.ts';
  }
  return 'content/grammar/days-22-28.ts';
}

/**
 * The checks a single day cannot make about itself.
 *
 * `schema.ts` guards one entry — its lengths, its Bangla, its table widths. The
 * rules here are about the **course**: that all 28 days exist, that none is
 * missing or duplicated, and that no two days carry the same title. A gap in
 * the sequence is the failure that matters, because the screen renders a list
 * and a learner cannot see that day 19 was never written — they see 27 days and
 * assume that is the course.
 */
export function validateGrammar(days: readonly GrammarDayEntry[] = GRAMMAR_DAYS): IGrammarValidation {
  const issues: IGrammarIssue[] = [];
  const seen = new Map<number, number>();
  const titles = new Map<string, number>();

  for (const day of days) {
    const parsed = grammarDaySchema.safeParse(day);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          file: fileFor(day.dayIndex),
          path: `day ${String(day.dayIndex)} · ${issue.path.join('.')}`,
          message: issue.message,
        });
      }
    }

    seen.set(day.dayIndex, (seen.get(day.dayIndex) ?? 0) + 1);

    const previous = titles.get(day.title.toLowerCase());

    if (previous !== undefined) {
      issues.push({
        file: fileFor(day.dayIndex),
        path: `day ${String(day.dayIndex)} · title`,
        message: `the same title is already used by day ${String(previous)}`,
      });
    }

    titles.set(day.title.toLowerCase(), day.dayIndex);
  }

  for (let dayIndex = 1; dayIndex <= GRAMMAR_COURSE_LENGTH; dayIndex += 1) {
    const count = seen.get(dayIndex) ?? 0;

    if (count === 0) {
      issues.push({
        file: fileFor(dayIndex),
        path: `day ${String(dayIndex)}`,
        message: 'the course has a gap here — every day from 1 to 28 must exist',
      });
    }

    if (count > 1) {
      issues.push({
        file: fileFor(dayIndex),
        path: `day ${String(dayIndex)}`,
        message: `written ${String(count)} times — each day index may appear once`,
      });
    }
  }

  return {
    issues,
    counts: {
      days: days.length,
      sections: days.reduce((sum, day) => sum + day.sections.length, 0),
      examples: days.reduce(
        (sum, day) => sum + day.sections.reduce((inner, section) => inner + section.examples.length, 0),
        0,
      ),
      mistakes: days.reduce((sum, day) => sum + day.mistakes.length, 0),
      checks: days.reduce((sum, day) => sum + day.checks.length, 0),
      minutes: days.reduce((sum, day) => sum + day.minutes, 0),
    },
  };
}
