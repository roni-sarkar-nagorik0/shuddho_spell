import { NotificationPreference } from '../entities/notification-preference';
import { ClockTime } from '../value-objects/clock-time';
import { LIVE_CHANNELS } from '../value-objects/notification-channel';
import { NOTIFICATION_TYPES, type NotificationType } from '../value-objects/notification-type';

/**
 * A learner who has never opened the preferences screen still has preferences.
 *
 * 005 stores a row per learner per type per channel and nothing creates them at
 * signup — deliberately, because sixteen rows per account that nobody has
 * opinions about yet is a lot of storage for a default. So the defaults live
 * here, in one place, and a stored row simply wins over one.
 *
 * The consequence worth stating: **an absent row means "on"**. A learner who
 * has never touched the screen gets their daily reminder, which is the
 * behaviour a learning product is for. Turning something off writes a row.
 */

/** Off by default. It is the only type that is marketing rather than teaching. */
const OFF_BY_DEFAULT: readonly NotificationType[] = Object.freeze(['product_update']);

/** 20:00 local — evening, after work, before the day the streak counts ends. */
const DEFAULT_REMINDER = '20:00';

/** 22:00 → 07:00, the window `09-notifications.md` uses as its own example. */
const DEFAULT_QUIET_START = '22:00';
const DEFAULT_QUIET_END = '07:00';

export class PreferenceDefaults {
  /**
   * The complete matrix for a learner: every type on every **live** channel,
   * with stored rows taking precedence.
   *
   * `email` never appears. The preferences UI ships In-app and Push columns
   * only — not greyed out, not "coming soon" — and a defaults service that
   * emitted a third would be the first place that promise broke.
   */
  forProfile(
    profileId: string,
    stored: readonly NotificationPreference[],
    newId: (type: NotificationType, channel: string) => string,
  ): readonly NotificationPreference[] {
    return NOTIFICATION_TYPES.flatMap((type) =>
      LIVE_CHANNELS.map((channel) => {
        const existing = stored.find(
          (preference) => preference.type === type && preference.channel === channel,
        );

        return (
          existing ??
          new NotificationPreference({
            id: newId(type, channel),
            profileId,
            type,
            channel,
            enabled: !OFF_BY_DEFAULT.includes(type),
            quietHoursStart: ClockTime.of(DEFAULT_QUIET_START),
            quietHoursEnd: ClockTime.of(DEFAULT_QUIET_END),
            reminderTime: type === 'daily_reminder' ? ClockTime.of(DEFAULT_REMINDER) : null,
          })
        );
      }),
    );
  }
}
