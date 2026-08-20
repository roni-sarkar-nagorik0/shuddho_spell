import { z } from 'zod';
import { LearnerProfile } from '../../domain/entities/learner-profile';
import { ACCENT_PREFERENCES } from '../../domain/value-objects/accent-preference';
import { UI_LANGUAGES } from '../../domain/value-objects/ui-language';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';

/**
 * The boundary that is allowed to be wrong about the data, and to say so.
 *
 * A Supabase result is untyped, so the row is parsed rather than trusted. The
 * columns are the ones the entity has and no others: selecting the whole row
 * would quietly widen what the mapper depends on.
 *
 * Every closed set is checked against its union rather than taken as a string.
 * 003 has the same check constraints, and this is what stops a value added
 * there from arriving in the domain unnoticed.
 */
const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  display_name: z.string(),
  track: z.enum(TRACKS),
  daily_minutes: z.number().int(),
  started_at: z.string(),
  timezone: z.string(),
  ui_language: z.enum(UI_LANGUAGES),
  current_day_index: z.number().int(),
  accent_preference: z.enum(ACCENT_PREFERENCES),
  // `numeric(3,2)` arrives as a string from some drivers and a number from
  // others. Coerced once, here, rather than guessed at every read site.
  playback_rate: z.coerce.number(),
  onboarding_completed_at: z.string().nullable(),
});

export const LEARNER_PROFILE_COLUMNS =
  'id, user_id, display_name, track, daily_minutes, started_at, timezone, ui_language, current_day_index, accent_preference, playback_rate, onboarding_completed_at';

/**
 * A batch, dropping rows that do not fit — the same call `parseRows` makes
 * everywhere else. A malformed profile in the notification job's roster is one
 * learner who misses a reminder, and failing the whole tick over it would cost
 * everyone else theirs.
 */
export function toLearnerProfiles(rows: readonly unknown[]): readonly LearnerProfile[] {
  return rows.flatMap((row) => {
    const profile = toLearnerProfile(row);

    return profile === null ? [] : [profile];
  });
}

export function toLearnerProfile(row: unknown): LearnerProfile | null {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;
  const completedAt = data.onboarding_completed_at;

  return new LearnerProfile({
    id: data.id,
    userId: data.user_id,
    displayName: data.display_name,
    track: data.track,
    dailyMinutes: data.daily_minutes,
    startedAt: new Date(data.started_at),
    timezone: data.timezone,
    uiLanguage: data.ui_language,
    currentDayIndex: DayIndex.of(data.current_day_index),
    accentPreference: data.accent_preference,
    playbackRate: data.playback_rate,
    onboardingCompletedAt: completedAt === null ? null : new Date(completedAt),
  });
}
