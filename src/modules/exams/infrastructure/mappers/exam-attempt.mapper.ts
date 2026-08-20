import { z } from 'zod';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { ExamAttempt } from '../../domain/entities/exam-attempt';
import { EXAM_SECTION_CODES, type ExamSectionCode } from '../../domain/value-objects/exam-section-code';
import { EXAM_STATUSES } from '../../domain/value-objects/exam-status';

/**
 * `section_scores` is jsonb, so it is validated like any other outside data
 * rather than trusted. A key that is not one of the four sections is dropped:
 * the alternative is a result screen rendering a section nobody defined.
 */
const sectionScoresSchema = z
  .record(z.string(), z.number())
  .transform((raw): Readonly<Partial<Record<ExamSectionCode, number>>> => {
    const scores: Partial<Record<ExamSectionCode, number>> = {};

    for (const code of EXAM_SECTION_CODES) {
      const value = raw[code];

      if (value !== undefined) {
        scores[code] = value;
      }
    }

    return scores;
  });

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  definition_id: z.string(),
  attempt_number: z.number().int(),
  status: z.enum(EXAM_STATUSES),
  started_at: z.string().nullable(),
  server_deadline_at: z.string().nullable(),
  submitted_at: z.string().nullable(),
  current_section_index: z.number().int(),
  score_percent: z.number().nullable(),
  section_scores: sectionScoresSchema,
  passed: z.boolean().nullable(),
  seed: z.string(),
});

export const EXAM_ATTEMPT_COLUMNS =
  'id, profile_id, definition_id, attempt_number, status, started_at, server_deadline_at, submitted_at, current_section_index, score_percent, section_scores, passed, seed';

function toEntity(parsed: z.infer<typeof rowSchema>): ExamAttempt {
  return new ExamAttempt({
    id: parsed.id,
    profileId: parsed.profile_id,
    definitionId: parsed.definition_id,
    attemptNumber: parsed.attempt_number,
    status: parsed.status,
    startedAt: parsed.started_at === null ? null : new Date(parsed.started_at),
    serverDeadlineAt:
      parsed.server_deadline_at === null ? null : new Date(parsed.server_deadline_at),
    submittedAt: parsed.submitted_at === null ? null : new Date(parsed.submitted_at),
    currentSectionIndex: parsed.current_section_index,
    scorePercent: parsed.score_percent === null ? null : ScorePercent.of(parsed.score_percent),
    sectionScores: parsed.section_scores,
    passed: parsed.passed,
    seed: parsed.seed,
  });
}

export function toExamAttempt(row: unknown): ExamAttempt | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toExamAttempts(rows: readonly unknown[]): readonly ExamAttempt[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toExamAttemptRow(attempt: ExamAttempt): Readonly<Record<string, unknown>> {
  return {
    id: attempt.id,
    profile_id: attempt.profileId,
    definition_id: attempt.definitionId,
    attempt_number: attempt.attemptNumber,
    status: attempt.status,
    started_at: attempt.startedAt === null ? null : attempt.startedAt.toISOString(),
    server_deadline_at:
      attempt.serverDeadlineAt === null ? null : attempt.serverDeadlineAt.toISOString(),
    submitted_at: attempt.submittedAt === null ? null : attempt.submittedAt.toISOString(),
    current_section_index: attempt.currentSectionIndex,
    score_percent: attempt.scorePercent === null ? null : attempt.scorePercent.value,
    section_scores: attempt.sectionScores,
    passed: attempt.passed,
    seed: attempt.seed,
  };
}
