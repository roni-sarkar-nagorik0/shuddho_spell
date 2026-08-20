/**
 * How a question is answered — 004's `exam_questions_type_check`.
 *
 * Separate from the section it sits in, because they do not correspond: the
 * grammar-and-construction section asks multiple-choice, construction and cloze
 * questions, and reading-to-writing asks its own. Scoring switches on this;
 * ordering and weighting switch on the section.
 */
export const EXAM_QUESTION_TYPES = Object.freeze([
  'dictation',
  'pronunciation',
  'multiple_choice',
  'construction',
  'cloze',
  'reading_response',
] as const);

export type ExamQuestionType = (typeof EXAM_QUESTION_TYPES)[number];
