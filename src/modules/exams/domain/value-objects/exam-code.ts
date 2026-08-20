/**
 * The five exams — 004's `exam_definitions_code_check`.
 *
 * A frozen const plus a derived union rather than an enum, so these strings are
 * the same strings the check constraint holds and a sixth exam fails the build
 * rather than an insert.
 */
export const EXAM_CODES = Object.freeze([
  'diagnostic',
  'milestone1',
  'milestone2',
  'milestone3',
  'final',
] as const);

export type ExamCode = (typeof EXAM_CODES)[number];

export function isExamCode(value: string): value is ExamCode {
  return (EXAM_CODES as readonly string[]).includes(value);
}
