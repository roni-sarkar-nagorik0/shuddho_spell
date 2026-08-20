/**
 * The eight things this application will tell a learner — 005's
 * `notifications_type_check`.
 *
 * Snake case, because that is what the constraint holds and translating between
 * two spellings of `daily_reminder` on the way to a query is a bug waiting for
 * the first typo. The camel-case names in `09-notifications.md` are prose.
 */
export const NOTIFICATION_TYPES = Object.freeze([
  'daily_reminder',
  'streak_at_risk',
  'review_items_due',
  'exam_unlocked',
  'exam_result',
  'weekly_report',
  'milestone_reached',
  'product_update',
] as const);

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}
