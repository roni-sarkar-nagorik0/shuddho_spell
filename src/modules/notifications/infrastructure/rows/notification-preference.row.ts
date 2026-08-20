/**
 * `public.notification_preferences` — 005_notification_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface INotificationPreferenceRow {
  readonly id: string;
  readonly profile_id: string;
  readonly type: string;
  readonly channel: string;
  readonly enabled: boolean;
  /** `time` columns, in the learner's own zone. A window may wrap midnight. */
  readonly quiet_hours_start: string | null;
  readonly quiet_hours_end: string | null;
  readonly reminder_time: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
