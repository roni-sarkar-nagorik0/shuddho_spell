import { z } from 'zod';
import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { ExamQuestion, type IExamQuestionForLearner } from '../../domain/entities/exam-question';
import { EXAM_QUESTION_TYPES } from '../../domain/value-objects/exam-question-type';
import { EXAM_SECTION_CODES } from '../../domain/value-objects/exam-section-code';

/**
 * jsonb of unknown shape, validated as exactly that.
 *
 * The payload's real shape depends on the question type and is the blueprint's
 * business; narrowing it here would put six question formats into a mapper and
 * make adding a seventh a schema change. `z.unknown()` with a structural
 * recursion keeps the value well-formed without pretending to know it.
 */
const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

const rowSchema = z.object({
  id: z.string(),
  attempt_id: z.string(),
  section_code: z.enum(EXAM_SECTION_CODES),
  order_index: z.number().int(),
  type: z.enum(EXAM_QUESTION_TYPES),
  payload: jsonSchema,
  correct_answer: jsonSchema,
  weight: z.number(),
});

export const EXAM_QUESTION_COLUMNS =
  'id, attempt_id, section_code, order_index, type, payload, correct_answer, weight';

/**
 * The same columns **without `correct_answer`**.
 *
 * Rule 3 of `08-exam-engine.md` says the answer key reaches no response body
 * before submission. A read that never selects the column cannot leak it
 * through a mapper mistake, a spread, or a debug log — the strongest form of
 * that guarantee available on this side of the wire.
 */
export const EXAM_QUESTION_LEARNER_COLUMNS =
  'id, attempt_id, section_code, order_index, type, payload, weight';

/** The learner-facing read has no `correct_answer` column to parse. */
const learnerRowSchema = rowSchema.omit({ correct_answer: true });

export function toLearnerExamQuestions(rows: readonly unknown[]): readonly IExamQuestionForLearner[] {
  return parseRows(learnerRowSchema, rows).map((parsed) => ({
    id: parsed.id,
    sectionCode: parsed.section_code,
    orderIndex: parsed.order_index,
    type: parsed.type,
    payload: parsed.payload,
    weight: parsed.weight,
  }));
}

function toEntity(parsed: z.infer<typeof rowSchema>): ExamQuestion {
  return new ExamQuestion({
    id: parsed.id,
    attemptId: parsed.attempt_id,
    sectionCode: parsed.section_code,
    orderIndex: parsed.order_index,
    type: parsed.type,
    payload: parsed.payload,
    correctAnswer: parsed.correct_answer,
    weight: parsed.weight,
  });
}

export function toExamQuestion(row: unknown): ExamQuestion | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toExamQuestions(rows: readonly unknown[]): readonly ExamQuestion[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toExamQuestionRow(question: ExamQuestion): Readonly<Record<string, unknown>> {
  return {
    id: question.id,
    attempt_id: question.attemptId,
    section_code: question.sectionCode,
    order_index: question.orderIndex,
    type: question.type,
    payload: question.payload,
    correct_answer: question.correctAnswer,
    weight: question.weight,
  };
}
