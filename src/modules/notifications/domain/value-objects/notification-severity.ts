/**
 * How loudly to say it — 005's `notifications_severity_check`.
 *
 * Severity is the notification's, not the channel's: the same "your streak ends
 * in two hours" is a warning whether it arrives as a toast or a push, and the
 * UI decides colour from this rather than from where it came in.
 */
export const NOTIFICATION_SEVERITIES = Object.freeze([
  'info',
  'success',
  'warning',
  'critical',
] as const);

export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];
