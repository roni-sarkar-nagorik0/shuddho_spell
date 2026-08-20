import { z } from 'zod';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';
import { ACCENT_PREFERENCES } from '../../domain/value-objects/accent-preference';

/** No identity field, for the reason every request schema in this project has none. */
export const completeOnboardingBodySchema = z.object({
  track: z.enum(TRACKS),
  dailyMinutes: z.number().int().min(5).max(120),
  accentPreference: z.enum(ACCENT_PREFERENCES),
});

export type CompleteOnboardingBody = z.infer<typeof completeOnboardingBodySchema>;
