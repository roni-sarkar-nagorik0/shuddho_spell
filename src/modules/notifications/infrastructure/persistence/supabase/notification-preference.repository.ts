import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type NotificationPreference } from '../../../domain/entities/notification-preference';
import { type INotificationPreferenceRepository } from '../../../domain/repositories/notification-preference-repository';
import {
  NOTIFICATION_PREFERENCE_COLUMNS,
  toNotificationPreferences,
  toNotificationPreferenceRow,
} from '../../mappers/notification-preference.mapper';

const TABLE = 'notification_preferences';

export class SupabaseNotificationPreferenceRepository
  implements INotificationPreferenceRepository
{
  constructor(private readonly db: IDatabase) {}

  async findByProfile(profileId: string): Promise<readonly NotificationPreference[]> {
    return toNotificationPreferences(
      await this.db.select({
        table: TABLE,
        columns: NOTIFICATION_PREFERENCE_COLUMNS,
        eq: { profile_id: profileId },
      }),
    );
  }

  /**
   * `ignoreDuplicates: false`: a conflict here means the learner is changing an
   * answer they already gave, which is the only reason anybody opens this
   * screen. Ignoring it would return 200 and keep the old setting.
   */
  async upsertMany(
    preferences: readonly NotificationPreference[],
  ): Promise<readonly NotificationPreference[]> {
    if (preferences.length === 0) {
      return preferences;
    }

    await this.db.upsert(TABLE, preferences.map(toNotificationPreferenceRow), {
      onConflict: 'profile_id,type,channel',
      ignoreDuplicates: false,
    });

    return preferences;
  }
}
