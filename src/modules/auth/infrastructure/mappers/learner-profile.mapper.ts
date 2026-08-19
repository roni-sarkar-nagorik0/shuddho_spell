import { z } from 'zod';
import { LearnerProfile } from '../../domain/entities/learner-profile';

/**
 * The boundary that is allowed to be wrong about the data, and to say so.
 *
 * A Supabase result is untyped, so the row is parsed rather than trusted. The
 * columns are the ones Phase 3's entity has and no others: selecting the whole
 * row would quietly widen what the mapper depends on.
 */
const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  display_name: z.string(),
  onboarding_completed_at: z.string().nullable(),
});

export const LEARNER_PROFILE_COLUMNS = 'id, user_id, display_name, onboarding_completed_at';

export function toLearnerProfile(row: unknown): LearnerProfile | null {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }

  const { id, user_id: userId, display_name: displayName } = parsed.data;
  const completedAt = parsed.data.onboarding_completed_at;

  return new LearnerProfile(id, userId, displayName, completedAt === null ? null : new Date(completedAt));
}
