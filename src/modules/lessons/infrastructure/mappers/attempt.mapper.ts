import { z } from 'zod';
import { ERROR_TAGS } from '@/modules/shared/domain/value-objects/error-tag';
import { ATTEMPT_ITEM_TYPES } from '@/modules/shared/domain/value-objects/item-type';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { Attempt } from '../../domain/entities/attempt';
import { ATTEMPT_MODES } from '../../domain/value-objects/attempt-mode';

const rowSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  profile_id: z.string(),
  item_type: z.enum(ATTEMPT_ITEM_TYPES),
  item_id: z.string(),
  mode: z.enum(ATTEMPT_MODES),
  submitted_value: z.string(),
  is_correct: z.boolean(),
  /** `numeric(5,2)` arrives as a string from some drivers, a number from others. */
  score: z.coerce.number(),
  error_tags: z.array(z.enum(ERROR_TAGS)),
  latency_ms: z.number().int().nullable(),
  created_at: z.string(),
});

export const ATTEMPT_COLUMNS =
  'id, session_id, profile_id, item_type, item_id, mode, submitted_value, is_correct, score, error_tags, latency_ms, created_at';

export function toAttempts(rows: readonly unknown[]): readonly Attempt[] {
  return parseRows(rowSchema, rows).map(
    (parsed) =>
      new Attempt({
        id: parsed.id,
        sessionId: parsed.session_id,
        profileId: parsed.profile_id,
        itemType: parsed.item_type,
        itemId: parsed.item_id,
        mode: parsed.mode,
        submittedValue: parsed.submitted_value,
        isCorrect: parsed.is_correct,
        score: ScorePercent.of(parsed.score),
        errorTags: parsed.error_tags,
        latencyMs: parsed.latency_ms,
        createdAt: new Date(parsed.created_at),
      }),
  );
}

export function toAttemptRow(attempt: Attempt): Readonly<Record<string, unknown>> {
  return {
    id: attempt.id,
    session_id: attempt.sessionId,
    profile_id: attempt.profileId,
    item_type: attempt.itemType,
    item_id: attempt.itemId,
    mode: attempt.mode,
    submitted_value: attempt.submittedValue,
    is_correct: attempt.isCorrect,
    score: attempt.score.value,
    error_tags: [...attempt.errorTags],
    latency_ms: attempt.latencyMs,
    created_at: attempt.createdAt.toISOString(),
  };
}
