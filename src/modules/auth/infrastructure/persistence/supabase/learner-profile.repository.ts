import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import {
  DatabaseError,
  PG_CODES,
} from '@/modules/shared/infrastructure/persistence/database-error';
import { type LearnerProfile } from '../../../domain/entities/learner-profile';
import {
  type ILearnerProfileRepository,
  type INewLearnerProfile,
} from '../../../domain/repositories/learner-profile-repository';
import {
  LEARNER_PROFILE_COLUMNS,
  toLearnerProfile,
  toLearnerProfiles,
} from '../../mappers/learner-profile.mapper';

const TABLE = 'learner_profiles';

/**
 * Backed by the **service client**, not the learner's own.
 *
 * 008 grants `authenticated` select and update on `learner_profiles` and writes
 * no insert policy at all: the row is the trigger's to create, never the
 * client's. The reconciler therefore has to be the one caller that bypasses
 * RLS, and it is safe to be because the only id it ever writes is the one the
 * session verified — it takes a `userId` and cannot be handed a filter.
 *
 * Reaches the database through `IDatabase`, the seam every repository shares
 * since F5.1. It named a Supabase type before that and was the only file in
 * `src/modules/` that did.
 */
export class SupabaseLearnerProfileRepository implements ILearnerProfileRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<LearnerProfile | null> {
    return toLearnerProfile(
      await this.db.selectOne({ table: TABLE, columns: LEARNER_PROFILE_COLUMNS, eq: { id } }),
    );
  }

  async listAll(limit: number): Promise<LearnerProfile[]> {
    return [
      ...toLearnerProfiles(
        await this.db.select({ table: TABLE, columns: LEARNER_PROFILE_COLUMNS, limit }),
      ),
    ];
  }

  async findByUserId(userId: string): Promise<LearnerProfile | null> {
    try {
      const row = await this.db.selectOne({
        table: TABLE,
        columns: LEARNER_PROFILE_COLUMNS,
        eq: { user_id: userId },
      });

      return toLearnerProfile(row);
    } catch (caught: unknown) {
      // "The read failed" and "there is no profile" are different facts, and
      // conflating them turns an outage into a signup loop.
      throw new Error(
        `could not read the learner profile: ${caught instanceof Error ? caught.message : 'unknown'}`,
      );
    }
  }

  /**
   * `on conflict do nothing`, then read back. Postgres decides who wins, so two
   * concurrent first requests produce one row and neither of them a 500 — the
   * loser simply reads what the winner wrote.
   */
  async insertIfAbsent(profile: INewLearnerProfile): Promise<LearnerProfile> {
    try {
      await this.db.upsert(TABLE, [{ user_id: profile.userId, display_name: profile.displayName }], {
        onConflict: 'user_id',
        // Leave the stored row alone on conflict. Without this the upsert
        // becomes an update and the loser of the race overwrites the display
        // name the winner just wrote.
        ignoreDuplicates: true,
      });
    } catch (caught: unknown) {
      // A unique violation here is the race resolving, not a failure — the
      // other request won and its row is what this one is about to read.
      if (!(caught instanceof DatabaseError) || !caught.is(PG_CODES.UniqueViolation)) {
        throw new Error(
          `could not create the learner profile: ${caught instanceof Error ? caught.message : 'unknown'}`,
        );
      }
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
   * actually stored is what stops the application believing a write the
   * database narrowed or refused.
   *
   * `user_id`, `started_at` and `id` are absent from the update by design. A
   * repository able to overwrite them is one that will eventually reassign a
   * profile to a different account.
   */
  async save(profile: LearnerProfile): Promise<LearnerProfile> {
    await this.db.update(
      TABLE,
      {
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
      },
      { id: profile.id },
    );

    const stored = await this.findByUserId(profile.userId);

    if (stored === null) {
      throw new Error(`the learner profile for ${profile.userId} vanished during save`);
    }

    return stored;
  }
}
