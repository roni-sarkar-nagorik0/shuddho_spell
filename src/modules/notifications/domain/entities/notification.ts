import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';
import { type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type NotificationChannel } from '../value-objects/notification-channel';
import { type NotificationSeverity } from '../value-objects/notification-severity';
import { type NotificationType } from '../value-objects/notification-type';

export interface INotificationProps {
  readonly id: string;
  readonly profileId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly severity: NotificationSeverity;
  readonly payload: JsonValue;
  /**
   * The window the dispatcher **aimed at**, not when it ran.
   *
   * This is the field that makes idempotency work. Two ticks of the same hourly
   * job aim at the same instant, so 005's unique key on
   * `(profile_id, type, scheduled_for)` rejects the second — which it could not
   * do if this were `now()`, since two ticks never share one of those.
   */
  readonly scheduledFor: Date;
  readonly sentAt: Date | null;
  readonly readAt: Date | null;
  readonly channelsDelivered: readonly NotificationChannel[];
}

/**
 * One thing the application told a learner.
 *
 * The row exists whether or not anything has gone out: an empty
 * `channelsDelivered` means queued, not failed. That distinction is the reason
 * dispatch can write the row first and send afterwards — the write is what
 * claims the idempotency key, and claiming it before sending is what stops a
 * retried cron tick sending twice.
 */
export class Notification {
  readonly id: string;
  readonly profileId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly severity: NotificationSeverity;
  readonly payload: JsonValue;
  readonly scheduledFor: Date;
  readonly sentAt: Date | null;
  readonly readAt: Date | null;
  readonly channelsDelivered: readonly NotificationChannel[];

  constructor(props: INotificationProps) {
    // 005's `notifications_read_implies_sent`. A notification the learner has
    // read but that was never sent is a dispatcher bug, and this is where it
    // surfaces rather than at an insert three layers away.
    if (props.readAt !== null && props.sentAt === null) {
      throw new InvalidValueError(
        'Notification',
        `${props.id} read but never sent`,
        'a read notification must have been sent',
      );
    }

    this.id = props.id;
    this.profileId = props.profileId;
    this.type = props.type;
    this.title = props.title;
    this.body = props.body;
    this.severity = props.severity;
    this.payload = props.payload;
    this.scheduledFor = props.scheduledFor;
    this.sentAt = props.sentAt;
    this.readAt = props.readAt;
    this.channelsDelivered = props.channelsDelivered;
  }

  isUnread(): boolean {
    return this.readAt === null;
  }

  isQueued(): boolean {
    return this.sentAt === null;
  }

  /**
   * Records that a channel delivered it.
   *
   * Additive and deduplicated: in-app and push deliver the same notification
   * and both say so, and a retried send must not list `push` twice.
   */
  delivered(channel: NotificationChannel, now: Date): Notification {
    return new Notification({
      ...this.toProps(),
      sentAt: this.sentAt ?? now,
      channelsDelivered: this.channelsDelivered.includes(channel)
        ? this.channelsDelivered
        : [...this.channelsDelivered, channel],
    });
  }

  /**
   * Marks it read. Idempotent by keeping the **first** timestamp: "when did I
   * see this" has one answer, and a second click is not a second reading.
   */
  read(now: Date): Notification {
    if (this.readAt !== null) {
      return this;
    }

    return new Notification({ ...this.toProps(), sentAt: this.sentAt ?? now, readAt: now });
  }

  private toProps(): INotificationProps {
    return {
      id: this.id,
      profileId: this.profileId,
      type: this.type,
      title: this.title,
      body: this.body,
      severity: this.severity,
      payload: this.payload,
      scheduledFor: this.scheduledFor,
      sentAt: this.sentAt,
      readAt: this.readAt,
      channelsDelivered: this.channelsDelivered,
    };
  }
}
