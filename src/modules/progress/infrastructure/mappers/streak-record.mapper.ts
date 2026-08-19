import { z } from 'zod';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { parseRow } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { StreakRecord } from '../../domain/entities/streak-record';

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  current_streak: z.number().int(),
  longest_streak: z.number().int(),
  /** A `date`: the learner-local day, resolved before it was written. */
  last_active_date: z.string().nullable(),
  freezes_remaining: z.number().int(),
});

export const STREAK_RECORD_COLUMNS =
  'id, profile_id, current_streak, longest_streak, last_active_date, freezes_remaining';

export function toStreakRecord(row: unknown): StreakRecord | null {
  const parsed = parseRow(rowSchema, row);

  if (parsed === null) {
    return null;
  }

  return new StreakRecord({
    id: parsed.id,
    profileId: parsed.profile_id,
    currentStreak: parsed.current_streak,
    longestStreak: parsed.longest_streak,
    lastActiveDate:
      parsed.last_active_date === null ? null : LocalDate.of(parsed.last_active_date),
    freezesRemaining: parsed.freezes_remaining,
  });
}

export function toStreakRecordRow(record: StreakRecord): Readonly<Record<string, unknown>> {
  return {
    id: record.id,
    profile_id: record.profileId,
    current_streak: record.currentStreak,
    longest_streak: record.longestStreak,
    last_active_date: record.lastActiveDate?.value ?? null,
    freezes_remaining: record.freezesRemaining,
  };
}
