import { z } from 'zod';
import { ERROR_TAGS } from '@/modules/shared/domain/value-objects/error-tag';
import { ATTEMPT_ITEM_TYPES } from '@/modules/shared/domain/value-objects/item-type';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { ReviewItem } from '../../domain/entities/review-item';

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  item_id: z.string(),
  item_type: z.enum(ATTEMPT_ITEM_TYPES),
  interval_index: z.number().int(),
  due_at: z.string(),
  times_seen: z.number().int(),
  times_correct: z.number().int(),
  consecutive_correct: z.number().int(),
  /** A `date`, already the learner-local day. Not a timestamp, deliberately. */
  last_correct_on: z.string().nullable(),
  is_mastered: z.boolean(),
  last_error_tags: z.array(z.enum(ERROR_TAGS)),
});

export const REVIEW_ITEM_COLUMNS =
  'id, profile_id, item_id, item_type, interval_index, due_at, times_seen, times_correct, consecutive_correct, last_correct_on, is_mastered, last_error_tags';

function toEntity(parsed: z.infer<typeof rowSchema>): ReviewItem {
  return new ReviewItem({
    id: parsed.id,
    profileId: parsed.profile_id,
    itemId: parsed.item_id,
    itemType: parsed.item_type,
    intervalIndex: parsed.interval_index,
    dueAt: new Date(parsed.due_at),
    timesSeen: parsed.times_seen,
    timesCorrect: parsed.times_correct,
    consecutiveCorrect: parsed.consecutive_correct,
    lastCorrectOn: parsed.last_correct_on === null ? null : LocalDate.of(parsed.last_correct_on),
    isMastered: parsed.is_mastered,
    lastErrorTags: parsed.last_error_tags,
  });
}

export function toReviewItem(row: unknown): ReviewItem | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toReviewItems(rows: readonly unknown[]): readonly ReviewItem[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toReviewItemRow(item: ReviewItem): Readonly<Record<string, unknown>> {
  return {
    id: item.id,
    profile_id: item.profileId,
    item_id: item.itemId,
    item_type: item.itemType,
    interval_index: item.intervalIndex,
    due_at: item.dueAt.toISOString(),
    times_seen: item.timesSeen,
    times_correct: item.timesCorrect,
    consecutive_correct: item.consecutiveCorrect,
    last_correct_on: item.lastCorrectOn?.value ?? null,
    is_mastered: item.isMastered,
    last_error_tags: [...item.lastErrorTags],
  };
}
