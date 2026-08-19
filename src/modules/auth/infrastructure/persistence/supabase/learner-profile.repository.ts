import { type LearnerProfile } from '../../../domain/entities/learner-profile';
import {
  type ILearnerProfileRepository,
  type INewLearnerProfile,
} from '../../../domain/repositories/learner-profile-repository';
import { LEARNER_PROFILE_COLUMNS, toLearnerProfile } from '../../mappers/learner-profile.mapper';
import { type IProfileDatabase } from './profile-database';

/** Postgres unique violation — someone else inserted this profile first. */
const UNIQUE_VIOLATION = '23505';

/**
 * Backed by the **service client**, not the learner's own.
 *
 * 008 grants `authenticated` select and update on `learner_profiles` and writes
 * no insert policy at all: the row is the trigger's to create, never the
 * client's. The reconciler therefore has to be the one caller that bypasses
 * RLS, and it is safe to be because the only id it ever writes is the one the
 * session verified — it takes a `userId` and cannot be handed a filter.
 */
export class SupabaseLearnerProfileRepository implements ILearnerProfileRepository {
  constructor(private readonly client: IProfileDatabase) {}

  async findByUserId(userId: string): Promise<LearnerProfile | null> {
    const { data, error } = await this.client
      .from('learner_profiles')
      .select(LEARNER_PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();

    if (error !== null) {
      throw new Error(`could not read the learner profile: ${error.message}`);
    }

    return toLearnerProfile(data);
  }

  /**
   * `on conflict do nothing`, then read back. Postgres decides who wins, so two
   * concurrent first requests produce one row and neither of them a 500 — the
   * loser simply reads what the winner wrote.
   *
   * `ignoreDuplicates` makes the insert return no row when it conflicted, which
   * is why the read-back is unconditional rather than a fallback. A plain
   * insert would raise 23505 at exactly the moment a learner is least able to
   * do anything about it.
   */
  async insertIfAbsent(profile: INewLearnerProfile): Promise<LearnerProfile> {
    const { error } = await this.client
      .from('learner_profiles')
      .upsert(
        { user_id: profile.userId, display_name: profile.displayName },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );

    if (error !== null && error.code !== UNIQUE_VIOLATION) {
      throw new Error(`could not create the learner profile: ${error.message}`);
    }

    const stored = await this.findByUserId(profile.userId);
    if (stored === null) {
      // The insert reported success and the row is not there. Nothing sensible
      // follows from that, and inventing a profile would hide it.
      throw new Error(`the learner profile for ${profile.userId} vanished between write and read`);
    }

    return stored;
  }

  /**
   * Writes the changeable columns and reads the row back.
   *
   * Reading back rather than trusting the entity it was handed: 003 has check
   * constraints this code does not restate — `current_day_index between 1 and
   * 28`, `playback_rate between 0.50 and 1.50` — and returning what was
   * actually stored is what stops the application believing a write that the
   * database narrowed or refused.
   */
  async save(profile: LearnerProfile): Promise<LearnerProfile> {
    const { error } = await this.client
      .from('learner_profiles')
      .update({
        display_name: profile.displayName,
        track: profile.track,
        daily_minutes: profile.dailyMinutes,
        timezone: profile.timezone,
        ui_language: profile.uiLanguage,
        current_day_index: profile.currentDayIndex.value,
        accent_preference: profile.accentPreference,
        playback_rate: profile.playbackRate,
        onboarding_completed_at:
          profile.onboardingCompletedAt === null
            ? null
            : profile.onboardingCompletedAt.toISOString(),
      })
      .eq('id', profile.id)
      .maybeSingle();

    if (error !== null) {
      throw new Error(`could not save the learner profile: ${error.message}`);
    }

    const stored = await this.findByUserId(profile.userId);

    if (stored === null) {
      throw new Error(`the learner profile for ${profile.userId} vanished during save`);
    }

    return stored;
  }
}
