import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';
import { type ClockTime } from '../value-objects/clock-time';
import { type NotificationChannel } from '../value-objects/notification-channel';
import { type NotificationType } from '../value-objects/notification-type';

export interface INotificationPreferenceProps {
  readonly id: string;
  readonly profileId: string;
  readonly type: NotificationType;
  readonly channel: NotificationChannel;
  readonly enabled: boolean;
  /** Null together with `quietHoursEnd`, or both set — 005 enforces the pair. */
  readonly quietHoursStart: ClockTime | null;
  readonly quietHoursEnd: ClockTime | null;
  /** When a `daily_reminder` should fire, in the learner's own timezone. */
  readonly reminderTime: ClockTime | null;
}

/**
 * One learner's answer for one type on one channel.
 *
 * Quiet hours live here rather than on the profile because they are per type in
 * 005's schema: a learner may want the daily reminder silenced overnight and
 * still want to know an exam result arrived. Whether that granularity is ever
 * exposed in the UI is a product question; the data supports it either way.
 *
 * **A window that wraps midnight is legal data**, not an error. `22:00 → 07:00`
 * has `start > end` and means exactly what it looks like. The entity refuses
 * only half a window, because one bound is not a window and the policy would
 * have to guess which way it opened.
 */
export class NotificationPreference {
  readonly id: string;
  readonly profileId: string;
  readonly type: NotificationType;
  readonly channel: NotificationChannel;
  readonly enabled: boolean;
  readonly quietHoursStart: ClockTime | null;
  readonly quietHoursEnd: ClockTime | null;
  readonly reminderTime: ClockTime | null;

  constructor(props: INotificationPreferenceProps) {
    if ((props.quietHoursStart === null) !== (props.quietHoursEnd === null)) {
      throw new InvalidValueError(
        'NotificationPreference',
        `${props.type}/${props.channel} with half a quiet window`,
        'quiet hours are set as a pair or not at all',
      );
    }

    this.id = props.id;
    this.profileId = props.profileId;
    this.type = props.type;
    this.channel = props.channel;
    this.enabled = props.enabled;
    this.quietHoursStart = props.quietHoursStart;
    this.quietHoursEnd = props.quietHoursEnd;
    this.reminderTime = props.reminderTime;
  }

  hasQuietHours(): boolean {
    return this.quietHoursStart !== null && this.quietHoursEnd !== null;
  }

  /**
   * Whether this window wraps past midnight.
   *
   * `22:00 → 07:00` does; `13:00 → 14:00` does not. The whole off-by-one
   * `09-notifications.md` calls out lives in the difference, and naming it here
   * means the policy asks a question instead of doing arithmetic twice.
   */
  wrapsMidnight(): boolean {
    const start = this.quietHoursStart;
    const end = this.quietHoursEnd;

    return (
      start !== null && end !== null && start.minutesSinceMidnight > end.minutesSinceMidnight
    );
  }

  /**
   * Whether a given local time falls inside the quiet window.
   *
   * Inclusive of the start, exclusive of the end. A learner whose quiet hours
   * begin at 22:00 expects silence *at* 22:00, and expects the 07:00 reminder
   * they set to arrive — treating both bounds the same way would break one of
   * those two, and the reminder is the one they would notice.
   */
  isQuietAt(local: ClockTime): boolean {
    const start = this.quietHoursStart;
    const end = this.quietHoursEnd;

    if (start === null || end === null) {
      return false;
    }

    const at = local.minutesSinceMidnight;

    return this.wrapsMidnight()
      ? at >= start.minutesSinceMidnight || at < end.minutesSinceMidnight
      : at >= start.minutesSinceMidnight && at < end.minutesSinceMidnight;
  }

  withEnabled(enabled: boolean): NotificationPreference {
    return new NotificationPreference({ ...this.toProps(), enabled });
  }

  private toProps(): INotificationPreferenceProps {
    return {
      id: this.id,
      profileId: this.profileId,
      type: this.type,
      channel: this.channel,
      enabled: this.enabled,
      quietHoursStart: this.quietHoursStart,
      quietHoursEnd: this.quietHoursEnd,
      reminderTime: this.reminderTime,
    };
  }
}
