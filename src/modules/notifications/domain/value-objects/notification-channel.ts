/**
 * How a notification can reach a learner — 005's channel check constraint.
 *
 * **`email` is in this union and the application never sends one.** That
 * asymmetry is deliberate and is written down in `09-notifications.md`: email
 * is a v2 decision, and keeping the value legal in the schema and the type
 * means adding the channel later needs no migration and no widening of a union
 * that other code has already switched on exhaustively.
 *
 * What stops it being sent is `LIVE_CHANNELS`, not the absence of a name.
 */
export const NOTIFICATION_CHANNELS = Object.freeze(['in_app', 'push', 'email'] as const);

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * The channels that actually deliver anything today.
 *
 * `NotificationPolicy` selects from this list and nothing else, so a preference
 * row asking for `email` is never chosen and no send is ever attempted. There
 * is no mailer to attempt it with — `09` is explicit that a port with no
 * implementation is dead weight that drifts, so `IMailer` is not declared.
 */
export const LIVE_CHANNELS = Object.freeze(['in_app', 'push'] as const);

export type LiveChannel = (typeof LIVE_CHANNELS)[number];

export function isLiveChannel(channel: NotificationChannel): channel is LiveChannel {
  return (LIVE_CHANNELS as readonly string[]).includes(channel);
}
