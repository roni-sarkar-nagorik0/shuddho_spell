import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type LiveChannel } from '../../domain/value-objects/notification-channel';
import { type NotificationSeverity } from '../../domain/value-objects/notification-severity';
import { type NotificationType } from '../../domain/value-objects/notification-type';

export interface INotificationView {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly severity: NotificationSeverity;
  readonly payload: JsonValue;
  readonly scheduledFor: string;
  readonly sentAt: string | null;
  readonly readAt: string | null;
}

export interface INotificationFeed {
  readonly notifications: readonly INotificationView[];
  readonly unreadCount: number;
}

/**
 * One row of the preferences table.
 *
 * `channel` is a `LiveChannel`, not a `NotificationChannel`: **there is no
 * email column and the type is where that is guaranteed**. `09-notifications.md`
 * asks for In-app and Push only — not greyed out, not "coming soon" — and a
 * view type that could not express a third column is a stronger promise than a
 * component that chooses not to render one.
 */
export interface IPreferenceView {
  readonly type: NotificationType;
  readonly channel: LiveChannel;
  readonly enabled: boolean;
  readonly quietHoursStart: string | null;
  readonly quietHoursEnd: string | null;
  readonly reminderTime: string | null;
}

export interface IPreferencesView {
  readonly preferences: readonly IPreferenceView[];
}

/**
 * The complete matrix, as the screen reads it.
 *
 * Shared by the read and the write so the two cannot disagree about the shape
 * of a table the learner sees before and after saving. The `email` filter is
 * here rather than in each caller, which is the only way it stays true when a
 * third caller arrives.
 */
export function toPreferenceViews(
  preferences: readonly {
    readonly type: NotificationType;
    readonly channel: string;
    readonly enabled: boolean;
    readonly quietHoursStart: { readonly toString: () => string } | null;
    readonly quietHoursEnd: { readonly toString: () => string } | null;
    readonly reminderTime: { readonly toString: () => string } | null;
  }[],
): readonly IPreferenceView[] {
  return preferences.flatMap((preference) =>
    preference.channel === 'in_app' || preference.channel === 'push'
      ? [
          {
            type: preference.type,
            channel: preference.channel,
            enabled: preference.enabled,
            quietHoursStart: preference.quietHoursStart?.toString() ?? null,
            quietHoursEnd: preference.quietHoursEnd?.toString() ?? null,
            reminderTime: preference.reminderTime?.toString() ?? null,
          },
        ]
      : [],
  );
}
