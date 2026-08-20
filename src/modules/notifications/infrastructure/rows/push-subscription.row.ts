import { type Json } from '@/lib/db/json';

/**
 * `public.push_subscriptions` — 005_notification_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IPushSubscriptionRow {
  readonly id: string;
  readonly profile_id: string;
  /** Globally unique: one endpoint belongs to one browser, not one learner. */
  readonly endpoint: string;
  /** The `p256dh` and `auth` pair. Narrowed by the mapper, not here. */
  readonly keys: Json;
  readonly user_agent: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
