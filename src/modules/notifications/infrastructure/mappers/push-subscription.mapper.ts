import { z } from 'zod';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { PushSubscription } from '../../domain/entities/push-subscription';

/**
 * The keys column is jsonb and is validated as the shape web-push needs.
 *
 * 005 already refuses a row missing either key, so this is the second of two
 * guards — and the one that runs when a row predates the constraint or arrives
 * from a restore. A subscription without both halves cannot be encrypted to,
 * so it is dropped rather than turned into an entity that fails on every send.
 */
const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  endpoint: z.string(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  user_agent: z.string().nullable(),
  created_at: z.string(),
});

export const PUSH_SUBSCRIPTION_COLUMNS = 'id, profile_id, endpoint, keys, user_agent, created_at';

function toEntity(parsed: z.infer<typeof rowSchema>): PushSubscription {
  return new PushSubscription({
    id: parsed.id,
    profileId: parsed.profile_id,
    endpoint: parsed.endpoint,
    keys: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth },
    userAgent: parsed.user_agent,
    createdAt: new Date(parsed.created_at),
  });
}

export function toPushSubscription(row: unknown): PushSubscription | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toPushSubscriptions(rows: readonly unknown[]): readonly PushSubscription[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toPushSubscriptionRow(
  subscription: PushSubscription,
): Readonly<Record<string, unknown>> {
  return {
    id: subscription.id,
    profile_id: subscription.profileId,
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    user_agent: subscription.userAgent,
  };
}
