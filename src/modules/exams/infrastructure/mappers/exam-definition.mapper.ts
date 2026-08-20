import { z } from 'zod';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { ExamDefinition, type IExamSectionDefinition } from '../../domain/entities/exam-definition';
import { EXAM_CODES } from '../../domain/value-objects/exam-code';
import { EXAM_SECTION_CODES } from '../../domain/value-objects/exam-section-code';

const definitionRowSchema = z.object({
  id: z.string(),
  code: z.enum(EXAM_CODES),
  title: z.string(),
  duration_seconds: z.number().int(),
  question_count: z.number().int(),
  pass_percent: z.number().nullable(),
  max_attempts: z.number().int().nullable(),
  cooldown_hours: z.number().int().nullable(),
  unlock_day_standard: z.number().int(),
  unlock_day_sprint: z.number().int(),
});

const sectionRowSchema = z.object({
  definition_id: z.string(),
  code: z.enum(EXAM_SECTION_CODES),
  weight: z.number(),
  order_index: z.number().int(),
  question_count: z.number().int(),
});

export const EXAM_DEFINITION_COLUMNS =
  'id, code, title, duration_seconds, question_count, pass_percent, max_attempts, cooldown_hours, unlock_day_standard, unlock_day_sprint';

export const EXAM_SECTION_COLUMNS =
  'definition_id, code, weight, order_index, question_count';

export interface IExamSectionRowGroup {
  readonly definitionId: string;
  readonly section: IExamSectionDefinition;
}

export function toExamSections(rows: readonly unknown[]): readonly IExamSectionRowGroup[] {
  return parseRows(sectionRowSchema, rows).map((parsed) => ({
    definitionId: parsed.definition_id,
    section: {
      code: parsed.code,
      weight: parsed.weight,
      orderIndex: parsed.order_index,
      questionCount: parsed.question_count,
    },
  }));
}

/**
 * The ids, before the entities.
 *
 * Sections have to be fetched before a definition can be constructed — the
 * entity refuses a graded exam whose weights do not total 100, and an entity
 * built with none would throw. So the rows are parsed twice: once for the ids
 * that drive the section query, once for the whole thing. Parsing twice is
 * cheap; reading an id off an unvalidated row with `as` is the thing the rules
 * forbid, and rightly.
 */
export function toExamDefinitionIds(rows: readonly unknown[]): readonly string[] {
  return parseRows(definitionRowSchema, rows).map((parsed) => parsed.id);
}

function toEntity(
  parsed: z.infer<typeof definitionRowSchema>,
  sections: readonly IExamSectionDefinition[],
): ExamDefinition {
  return new ExamDefinition({
    id: parsed.id,
    code: parsed.code,
    title: parsed.title,
    durationSeconds: parsed.duration_seconds,
    questionCount: parsed.question_count,
    passPercent: parsed.pass_percent,
    maxAttempts: parsed.max_attempts,
    cooldownHours: parsed.cooldown_hours,
    unlockDayStandard: parsed.unlock_day_standard,
    unlockDaySprint: parsed.unlock_day_sprint,
    sections,
  });
}

export function toExamDefinition(
  row: unknown,
  sections: readonly IExamSectionDefinition[],
): ExamDefinition | null {
  const parsed = parseRow(definitionRowSchema, row);

  return parsed === null ? null : toEntity(parsed, sections);
}

export function toExamDefinitions(
  rows: readonly unknown[],
  sectionsByDefinition: ReadonlyMap<string, readonly IExamSectionDefinition[]>,
): readonly ExamDefinition[] {
  return parseRows(definitionRowSchema, rows).map((parsed) =>
    toEntity(parsed, sectionsByDefinition.get(parsed.id) ?? []),
  );
}
