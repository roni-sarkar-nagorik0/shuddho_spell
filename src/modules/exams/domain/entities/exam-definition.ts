import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';
import { type Track } from '@/modules/shared/domain/value-objects/track';
import { type ExamCode } from '../value-objects/exam-code';
import { type ExamSectionCode } from '../value-objects/exam-section-code';

/** One weighted section of a graded exam — a row of `exam_sections`. */
export interface IExamSectionDefinition {
  readonly code: ExamSectionCode;
  /** Out of 100. The four together must total exactly that. */
  readonly weight: number;
  readonly orderIndex: number;
  readonly questionCount: number;
}

export interface IExamDefinitionProps {
  readonly id: string;
  readonly code: ExamCode;
  readonly title: string;
  readonly durationSeconds: number;
  readonly questionCount: number;
  /** Null is data: the diagnostic is ungraded and sets `currentDayIndex`. */
  readonly passPercent: number | null;
  readonly maxAttempts: number | null;
  readonly cooldownHours: number | null;
  readonly unlockDayStandard: number;
  readonly unlockDaySprint: number;
  readonly sections: readonly IExamSectionDefinition[];
}

/** 35 + 20 + 30 + 15. `08-exam-engine.md` fixes them and 004 cannot check them. */
const REQUIRED_WEIGHT_TOTAL = 100;

/**
 * One of the five exams, and everything about it that is not a learner's.
 *
 * The three grading fields travel together or not at all — 004 enforces that
 * with `exam_definitions_grading_complete`, and the entity says why: a
 * half-configured exam, with a pass mark and no attempt limit, is exactly what
 * lets an unlimited retake through. `isGraded()` is the one question the rest of
 * the engine asks, so the null-checking happens here once.
 *
 * The weights total is checked here and **not** in the database, because it is a
 * per-definition invariant across four rows and a row-level check cannot see the
 * other three. A definition whose sections total 95 would score every attempt
 * against it 5% low, silently, forever.
 */
export class ExamDefinition {
  readonly id: string;
  readonly code: ExamCode;
  readonly title: string;
  readonly durationSeconds: number;
  readonly questionCount: number;
  readonly passPercent: number | null;
  readonly maxAttempts: number | null;
  readonly cooldownHours: number | null;
  readonly unlockDayStandard: number;
  readonly unlockDaySprint: number;
  readonly sections: readonly IExamSectionDefinition[];

  constructor(props: IExamDefinitionProps) {
    this.id = props.id;
    this.code = props.code;
    this.title = props.title;
    this.durationSeconds = props.durationSeconds;
    this.questionCount = props.questionCount;
    this.passPercent = props.passPercent;
    this.maxAttempts = props.maxAttempts;
    this.cooldownHours = props.cooldownHours;
    this.unlockDayStandard = props.unlockDayStandard;
    this.unlockDaySprint = props.unlockDaySprint;
    this.sections = [...props.sections].sort((left, right) => left.orderIndex - right.orderIndex);

    const graded = props.passPercent !== null;
    const total = this.sections.reduce((sum, section) => sum + section.weight, 0);

    if (graded && total !== REQUIRED_WEIGHT_TOTAL) {
      throw new InvalidValueError(
        'ExamDefinition',
        `${props.code} weighing ${String(total)}`,
        `section weights must total ${String(REQUIRED_WEIGHT_TOTAL)}`,
      );
    }
  }

  /** Graded exams have a pass mark, an attempt limit and a cooldown. */
  isGraded(): boolean {
    return this.passPercent !== null;
  }

  unlockDayFor(track: Track): number {
    return track === 'sprint21' ? this.unlockDaySprint : this.unlockDayStandard;
  }

  /**
   * Whether a score passes. An ungraded exam passes nothing and fails nothing —
   * asking is a category error, and returning `true` would advance a learner
   * off the back of a diagnostic.
   */
  passes(scorePercent: number): boolean {
    return this.passPercent !== null && scorePercent >= this.passPercent;
  }

  sectionAt(index: number): IExamSectionDefinition | null {
    return this.sections[index] ?? null;
  }

  section(code: ExamSectionCode): IExamSectionDefinition | null {
    return this.sections.find((section) => section.code === code) ?? null;
  }

  /** How many sections there are — the index at which an attempt is finished. */
  get sectionCount(): number {
    return this.sections.length;
  }
}
