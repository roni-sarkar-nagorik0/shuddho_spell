import { type Notification } from '../../domain/entities/notification';

export const IN_APP_NOTIFIER = Symbol('IN_APP_NOTIFIER');

export interface IInAppDelivery {
  readonly notification: Notification;
  /**
   * False when this dispatch was a retry and the row already existed.
   *
   * The caller uses it to decide whether to push: writing the row is what
   * claims the idempotency key, so the caller that wrote it is the one that
   * delivers, and a second tick delivers nothing.
   */
  readonly created: boolean;
}

/**
 * The in-app channel.
 *
 * A port beside `IPushSender` rather than the repository directly, so a
 * dispatch use case talks to two channels in the same shape and does not have
 * one of them reaching into persistence while the other goes through an
 * interface. It also leaves room for the thing this will grow into — a live
 * feed push over a socket — without touching a use case.
 */
export interface IInAppNotifier {
  readonly deliver: (notification: Notification) => Promise<IInAppDelivery>;
}
