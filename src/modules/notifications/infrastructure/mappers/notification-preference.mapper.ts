import { z } from 'zod';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { NotificationPreference } from '../../domain/entities/notification-preference';
import { ClockTime } from '../../domain/value-objects/clock-time';
import { NOTIFICATION_CHANNELS } from '../../domain/value-objects/notification-channel';
import { NOTIFICATION_TYPES } from '../../domain/value-objects/notification-type';

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  channel: z.enum(NOTIFICATION_CHANNELS),
  enabled: z.boolean(),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
  reminder_time: z.string().nullable(),
});

export const NOTIFICATION_PREFERENCE_COLUMNS =
  'id, profile_id, type, channel, enabled, quiet_hours_start, quiet_hours_end, reminder_time';

export function toNotificationPreferences(
  rows: readonly unknown[],
): readonly NotificationPreference[] {
  return parseRows(rowSchema, rows).map(
    (parsed) =>
      new NotificationPreference({
        id: parsed.id,
        profileId: parsed.profile_id,
        type: parsed.type,
        channel: parsed.channel,
        enabled: parsed.enabled,
        // Postgres `time` reads back as `HH:MM:SS`; `ClockTime` accepts both
        // that and `HH:MM`, so nothing has to know which one it got.
        quietHoursStart:
          parsed.quiet_hours_start === null ? null : ClockTime.of(parsed.quiet_hours_start),
        quietHoursEnd:
          parsed.quiet_hours_end === null ? null : ClockTime.of(parsed.quiet_hours_end),
        reminderTime: parsed.reminder_time === null ? null : ClockTime.of(parsed.reminder_time),
      }),
  );
}

export function toNotificationPreferenceRow(
  preference: NotificationPreference,
): Readonly<Record<string, unknown>> {
  return {
    id: preference.id,
    profile_id: preference.profileId,
    type: preference.type,
    channel: preference.channel,
    enabled: preference.enabled,
    quiet_hours_start: preference.quietHoursStart?.toString() ?? null,
    quiet_hours_end: preference.quietHoursEnd?.toString() ?? null,
    reminder_time: preference.reminderTime?.toString() ?? null,
  };
}
