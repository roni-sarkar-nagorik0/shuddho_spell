import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';

/** One sentence that shows the rule working, with what to notice in it. */
export interface IGrammarExample {
  readonly english: string;
  readonly note: string | null;
}

/** A form table: conjugations, the three forms of a tense, a comparison. */
export interface IGrammarTable {
  readonly caption: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** One teaching block — the idea in English, the idea in Bangla, the proof. */
export interface IGrammarSection {
  readonly heading: string;
  readonly plain: string;
  readonly bangla: string;
  readonly examples: readonly IGrammarExample[];
  readonly table: IGrammarTable | null;
}

export interface IGrammarMistake {
  readonly wrong: string;
  readonly right: string;
  readonly why: string;
}

export interface IGrammarCheck {
  readonly prompt: string;
  readonly answer: string;
  readonly why: string;
}

/**
 * The four stages of the course, one per week.
 *
 * Derived from the day rather than stored on it. A level written into each
 * entry would be a second source for something the day index already decides,
 * and the two would eventually disagree — day 15 labelled `building` in a file
 * whose first line says week 3.
 */
export const GRAMMAR_LEVELS = Object.freeze([
  'basic',
  'building',
  'strong',
  'advanced',
] as const);

export type GrammarLevel = (typeof GRAMMAR_LEVELS)[number];

/**
 * One day of the grammar course.
 *
 * Read-only teaching material: no learner ever writes to it, nothing points at
 * it by foreign key, and it has no state to protect. That is why it is an
 * entity with no behaviour beyond describing itself — the invariants that
 * matter (a section has examples, a mistake has a reason, the course has 28
 * days and no gaps) are enforced where the content is written, by
 * `content/grammar/schema.ts` and the validator beside it, at build time.
 */
export class GrammarLesson {
  constructor(
    readonly day: DayIndex,
    readonly title: string,
    readonly banglaTitle: string,
    /** What the learner can do at the end of it. */
    readonly goal: string,
    /** Where this shows up in the exam, in named parts and tasks. */
    readonly ieltsWhy: string,
    readonly minutes: number,
    readonly sections: readonly IGrammarSection[],
    readonly mistakes: readonly IGrammarMistake[],
    /** Sentence frames to carry into the exam. */
    readonly ieltsMoves: readonly string[],
    readonly checks: readonly IGrammarCheck[],
  ) {}

  get weekIndex(): number {
    return this.day.weekIndex();
  }

  level(): GrammarLevel {
    // `DayIndex` is 1..28, so `weekIndex()` is 1..4 and the lookup cannot miss.
    // Written as a switch rather than an array index so that a fifth week would
    // fail the exhaustiveness check instead of returning undefined.
    switch (this.weekIndex) {
      case 1:
        return 'basic';
      case 2:
        return 'building';
      case 3:
        return 'strong';
      default:
        return 'advanced';
    }
  }
}
