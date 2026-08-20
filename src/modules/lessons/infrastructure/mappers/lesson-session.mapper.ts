import { z } from 'zod';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { LessonSession } from '../../domain/entities/lesson-session';
import { LESSON_STAGES } from '../../domain/value-objects/lesson-stage';

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  day_index: z.number().int(),
  stage: z.enum(LESSON_STAGES),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  items_total: z.number().int(),
  items_correct: z.number().int(),
});

export const LESSON_SESSION_COLUMNS =
  'id, profile_id, day_index, stage, started_at, completed_at, items_total, items_correct';

function toEntity(parsed: z.infer<typeof rowSchema>): LessonSession {
  return new LessonSession({
    id: parsed.id,
    profileId: parsed.profile_id,
    dayIndex: DayIndex.of(parsed.day_index),
    stage: parsed.stage,
    startedAt: new Date(parsed.started_at),
    completedAt: parsed.completed_at === null ? null : new Date(parsed.completed_at),
    itemsTotal: parsed.items_total,
    itemsCorrect: parsed.items_correct,
  });
}

export function toLessonSession(row: unknown): LessonSession | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toLessonSessions(rows: readonly unknown[]): readonly LessonSession[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toLessonSessionRow(session: LessonSession): Readonly<Record<string, unknown>> {
  return {
    id: session.id,
    profile_id: session.profileId,
    day_index: session.dayIndex.value,
    stage: session.stage,
    started_at: session.startedAt.toISOString(),
    completed_at: session.completedAt === null ? null : session.completedAt.toISOString(),
    items_total: session.itemsTotal,
    items_correct: session.itemsCorrect,
  };
}
