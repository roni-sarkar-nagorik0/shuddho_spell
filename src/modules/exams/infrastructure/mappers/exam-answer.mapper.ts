import { z } from 'zod';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { ExamAnswer } from '../../domain/entities/exam-answer';

const rowSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  attempt_id: z.string(),
  profile_id: z.string(),
  submitted_value: z.string().nullable(),
  is_correct: z.boolean().nullable(),
  awarded_points: z.number(),
  flagged: z.boolean(),
  answered_at: z.string().nullable(),
  time_spent_ms: z.number().int().nullable(),
});

export const EXAM_ANSWER_COLUMNS =
  'id, question_id, attempt_id, profile_id, submitted_value, is_correct, awarded_points, flagged, answered_at, time_spent_ms';

function toEntity(parsed: z.infer<typeof rowSchema>): ExamAnswer {
  return new ExamAnswer({
    id: parsed.id,
    questionId: parsed.question_id,
    attemptId: parsed.attempt_id,
    profileId: parsed.profile_id,
    submittedValue: parsed.submitted_value,
    isCorrect: parsed.is_correct,
    awardedPoints: parsed.awarded_points,
    flagged: parsed.flagged,
    answeredAt: parsed.answered_at === null ? null : new Date(parsed.answered_at),
    timeSpentMs: parsed.time_spent_ms,
  });
}

export function toExamAnswer(row: unknown): ExamAnswer | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toExamAnswers(rows: readonly unknown[]): readonly ExamAnswer[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toExamAnswerRow(answer: ExamAnswer): Readonly<Record<string, unknown>> {
  return {
    id: answer.id,
    question_id: answer.questionId,
    attempt_id: answer.attemptId,
    profile_id: answer.profileId,
    submitted_value: answer.submittedValue,
    is_correct: answer.isCorrect,
    awarded_points: answer.awardedPoints,
    flagged: answer.flagged,
    answered_at: answer.answeredAt === null ? null : answer.answeredAt.toISOString(),
    time_spent_ms: answer.timeSpentMs,
  };
}
