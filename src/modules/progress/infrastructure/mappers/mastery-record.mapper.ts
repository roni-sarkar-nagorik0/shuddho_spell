import { z } from 'zod';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { MasteryRecord } from '../../domain/entities/mastery-record';
import { MASTERY_DIMENSIONS } from '../../domain/value-objects/mastery-dimension';

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  dimension: z.enum(MASTERY_DIMENSIONS),
  dimension_id: z.string(),
  attempts: z.number().int(),
  correct: z.number().int(),
  last_updated_at: z.string(),
});

/**
 * `accuracy` is **not read**. The column exists and is written from here, but
 * the entity derives it from `attempts` and `correct` — reading it back would
 * make two numbers that can disagree, and a matrix showing 4/5 beside 60% is
 * one nobody trusts again.
 */
export const MASTERY_RECORD_COLUMNS =
  'id, profile_id, dimension, dimension_id, attempts, correct, last_updated_at';

export function toMasteryRecords(rows: readonly unknown[]): readonly MasteryRecord[] {
  return parseRows(rowSchema, rows).map(
    (parsed) =>
      new MasteryRecord({
        id: parsed.id,
        profileId: parsed.profile_id,
        dimension: parsed.dimension,
        dimensionId: parsed.dimension_id,
        attempts: parsed.attempts,
        correct: parsed.correct,
        lastUpdatedAt: new Date(parsed.last_updated_at),
      }),
  );
}

export function toMasteryRecordRow(record: MasteryRecord): Readonly<Record<string, unknown>> {
  return {
    id: record.id,
    profile_id: record.profileId,
    dimension: record.dimension,
    dimension_id: record.dimensionId,
    attempts: record.attempts,
    correct: record.correct,
    // Written, never read. The derived value is the truth; this column is for
    // SQL that wants to sort or filter without recomputing it.
    accuracy: record.accuracy().value,
    last_updated_at: record.lastUpdatedAt.toISOString(),
  };
}
