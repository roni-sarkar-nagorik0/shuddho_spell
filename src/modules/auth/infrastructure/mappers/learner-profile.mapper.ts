import { z } from 'zod';
import { LearnerProfile } from '../../domain/entities/learner-profile';
import { TRACKS } from '../../domain/value-objects/track';

/**
 * The boundary that is allowed to be wrong about the data, and to say so.
 *
 * A Supabase result is untyped, so the row is parsed rather than trusted. The
 * columns are the ones Phase 3's entity has and no others: selecting the whole
 * row would quietly widen what the mapper depends on.
 *
 * `track` is checked against the union rather than taken as a string. 003 has a
 * check constraint saying the same thing, and this is what stops a third value
 * added there from arriving in the domain unnoticed.
 */
const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  display_name: z.string(),
  track: z.enum(TRACKS),
  current_day_index: z.number().int(),
  onboarding_completed_at: z.string().nullable(),
});

export const LEARNER_PROFILE_COLUMNS =
  'id, user_id, display_name, track, current_day_index, onboarding_completed_at';

export function toLearnerProfile(row: unknown): LearnerProfile | null {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;
  const completedAt = data.onboarding_completed_at;

  return new LearnerProfile(
    data.id,
    data.user_id,
    data.display_name,
    data.track,
    data.current_day_index,
    completedAt === null ? null : new Date(completedAt),
  );
}
