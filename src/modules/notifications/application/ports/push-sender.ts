import { type PushSubscription } from '../../domain/entities/push-subscription';

export const PUSH_SENDER = Symbol('PUSH_SENDER');

export interface IPushMessage {
  readonly title: string;
  readonly body: string;
  /** Where clicking it should land. Relative to the app's origin. */
  readonly url: string;
  /**
   * Collapses replacements. Two "reviews due" pushes with the same tag show as
   * one notification, which is what a learner who left the tab open for a day
   * wants — a stack of eight is how the permission gets revoked.
   */
  readonly tag: string;
}

export const PUSH_RESULTS = Object.freeze(['sent', 'expired', 'throttled', 'failed', 'unconfigured'] as const);

export type PushResult = (typeof PUSH_RESULTS)[number];

/**
 * Sends one push to one browser.
 *
 * **It returns an outcome and does not throw.** That is the whole shape of the
 * port and it comes straight from `09-notifications.md`: a 410 means the
 * subscription is dead and the adapter deletes it *without throwing*, because a
 * dead endpoint is the normal end of a browser's life — somebody cleared their
 * site data — and an exception would abort a batch over the least surprising
 * event in the system.
 *
 * `unconfigured` is an outcome rather than an error for the same reason. An app
 * running without VAPID keys has push switched off; a learner not getting a
 * push is a degraded feature, and taking the request down over it would be a
 * far worse outcome than the one it prevents.
 */
export interface IPushSender {
  readonly send: (
    subscription: PushSubscription,
    message: IPushMessage,
  ) => Promise<PushResult>;
}
