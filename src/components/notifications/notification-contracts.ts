import { z } from 'zod';

/**
 * The client's view of the notification API, validated on arrival.
 *
 * Declared here rather than imported from the module's DTOs because a Client
 * Component may not reach into `src/modules` — `presentation` and `components`
 * are different zones and the boundary lint says so. What keeps the two in step
 * is `apiFetch`, which refuses a payload that does not match this schema: a
 * server change that broke the shape would fail loudly at the first fetch
 * rather than render as `undefined` somewhere.
 */
export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  severity: z.enum(['info', 'success', 'warning', 'critical']),
  scheduledFor: z.string(),
  sentAt: z.string().nullable(),
  readAt: z.string().nullable(),
});

export type NotificationItem = z.infer<typeof notificationSchema>;

export const notificationFeedSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().min(0),
});

export type NotificationFeed = z.infer<typeof notificationFeedSchema>;

export const unreadCountSchema = z.object({ unreadCount: z.number().int().min(0) });

/**
 * **Two channels. There is no third and this type cannot express one.**
 *
 * `09-notifications.md` asks for In-app and Push columns only — not greyed out,
 * not "coming soon" — and the preferences table renders a column per entry of
 * this tuple. A component cannot render an Email column because there is no
 * value it could render it from.
 */
export const CHANNEL_COLUMNS = Object.freeze(['in_app', 'push'] as const);

export type ChannelColumn = (typeof CHANNEL_COLUMNS)[number];

export const preferenceSchema = z.object({
  type: z.string(),
  channel: z.enum(CHANNEL_COLUMNS),
  enabled: z.boolean(),
  quietHoursStart: z.string().nullable(),
  quietHoursEnd: z.string().nullable(),
  reminderTime: z.string().nullable(),
});

export type Preference = z.infer<typeof preferenceSchema>;

export const preferencesSchema = z.object({ preferences: z.array(preferenceSchema) });

/** Human labels for the eight types, in the order the table shows them. */
export const TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  daily_reminder: 'Daily reminder',
  streak_at_risk: 'Streak about to end',
  review_items_due: 'Reviews due',
  exam_unlocked: 'Exam unlocked',
  exam_result: 'Exam result',
  weekly_report: 'Weekly report',
  milestone_reached: 'Milestone passed',
  product_update: 'Product updates',
});

export const CHANNEL_LABELS: Readonly<Record<ChannelColumn, string>> = Object.freeze({
  in_app: 'In-app',
  push: 'Push',
});
