import { type Json } from '@/lib/db/json';

/**
 * `public.notifications` — 005_notification_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface INotificationRow {
  readonly id: string;
  readonly profile_id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly severity: string;
  readonly payload: Json;
  /** The window the dispatcher aimed at, so a retry stays idempotent. */
  readonly scheduled_for: string;
  readonly sent_at: string | null;
  readonly read_at: string | null;
  readonly channels_delivered: readonly string[];
  readonly created_at: string;
  readonly updated_at: string;
}
