/**
 * The four sections of a graded exam — 004's `exam_sections_code_check`.
 *
 * Underscored, not hyphenated: `08-exam-engine.md` writes
 * `grammar-and-construction` in prose and 004 stores `grammar_and_construction`,
 * and the database spelling wins everywhere inside the app so nothing has to
 * translate between two spellings of one section on the way to a query.
 */
export const EXAM_SECTION_CODES = Object.freeze([
  'dictation',
  'pronunciation',
  'grammar_and_construction',
  'reading_to_writing',
] as const);

export type ExamSectionCode = (typeof EXAM_SECTION_CODES)[number];
