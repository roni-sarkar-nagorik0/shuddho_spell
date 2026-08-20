import { type Notification } from '../../domain/entities/notification';
import { type INotificationRepository } from '../../domain/repositories/notification-repository';
import {
  type IInAppDelivery,
  type IInAppNotifier,
} from '../../application/ports/in-app-notifier';

/**
 * The in-app channel: it writes a row.
 *
 * Thin on purpose. The interesting behaviour is the repository's
 * `insertIfAbsent`, which claims the idempotency key or discovers it was
 * already claimed, and the interesting *decision* is what the caller does with
 * `created` — the writer that won the race is the one that sends the push, and
 * a second tick sends nothing.
 *
 * `delivered('in_app')` is recorded immediately, because for this channel
 * writing the row **is** the delivery: there is no network in between that
 * could fail after the fact.
 */
export class NotificationWriter implements IInAppNotifier {
  constructor(private readonly notifications: INotificationRepository) {}

  async deliver(notification: Notification): Promise<IInAppDelivery> {
    const inserted = await this.notifications.insertIfAbsent(notification);

    if (!inserted.created) {
      return inserted;
    }

    const delivered = await this.notifications.save(
      inserted.notification.delivered('in_app', notification.scheduledFor),
    );

    return { notification: delivered, created: true };
  }
}
