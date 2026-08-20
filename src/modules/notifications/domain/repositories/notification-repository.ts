import { type Notification } from '../entities/notification';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface INotificationRepository {
  readonly findById: (id: string) => Promise<Notification | null>;

  /** Newest first, capped. The bell popover shows a page, not a lifetime. */
  readonly findByProfile: (profileId: string, limit: number) => Promise<readonly Notification[]>;

  /**
   * `count(*)` without transferring the rows.
   *
   * The bell shows a number and nothing else; fetching every unread
   * notification to call `.length` is the N+1 wearing a badge.
   */
  readonly countUnread: (profileId: string) => Promise<number>;

  /**
   * Writes the row **only if the idempotency key is free**, and returns what is
   * stored either way.
   *
   * `on conflict do nothing` plus a read-back, exactly like the profile
   * bootstrap. The database decides the race: a retried cron tick, a duplicated
   * scheduler fire or a redeploy mid-run finds the row the winner wrote instead
   * of creating a second. That is the whole of `09-notifications.md`'s
   * idempotency requirement, and it works because `scheduled_for` is the window
   * aimed at rather than the instant the job ran.
   */
  readonly insertIfAbsent: (notification: Notification) => Promise<INotificationInsert>;

  readonly save: (notification: Notification) => Promise<Notification>;

  /** One statement. Marking forty notifications read is not forty writes. */
  readonly markAllRead: (profileId: string, now: Date) => Promise<number>;
}

export interface INotificationInsert {
  readonly notification: Notification;
  /**
   * False when the row already existed — the caller is a retry.
   *
   * Dispatch reads this to decide whether to **send**: the row is the claim on
   * the idempotency key, so whoever wrote it is the one who gets to deliver.
   */
  readonly created: boolean;
}
