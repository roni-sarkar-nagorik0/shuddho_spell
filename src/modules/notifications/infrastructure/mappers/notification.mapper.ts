import { z } from 'zod';
import { isJsonObject, type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { parseRow, parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { Notification } from '../../domain/entities/notification';
import { NOTIFICATION_CHANNELS } from '../../domain/value-objects/notification-channel';
import { NOTIFICATION_SEVERITIES } from '../../domain/value-objects/notification-severity';
import { NOTIFICATION_TYPES } from '../../domain/value-objects/notification-type';

const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string(),
  severity: z.enum(NOTIFICATION_SEVERITIES),
  payload: jsonSchema,
  scheduled_for: z.string(),
  sent_at: z.string().nullable(),
  read_at: z.string().nullable(),
  // Checked against the union rather than taken as strings: a channel added to
  // 005's constraint must not arrive in the domain as a value nothing renders.
  channels_delivered: z.array(z.enum(NOTIFICATION_CHANNELS)),
});

export const NOTIFICATION_COLUMNS =
  'id, profile_id, type, title, body, severity, payload, scheduled_for, sent_at, read_at, channels_delivered';

function toEntity(parsed: z.infer<typeof rowSchema>): Notification {
  return new Notification({
    id: parsed.id,
    profileId: parsed.profile_id,
    type: parsed.type,
    title: parsed.title,
    body: parsed.body,
    severity: parsed.severity,
    payload: isJsonObject(parsed.payload) ? parsed.payload : {},
    scheduledFor: new Date(parsed.scheduled_for),
    sentAt: parsed.sent_at === null ? null : new Date(parsed.sent_at),
    readAt: parsed.read_at === null ? null : new Date(parsed.read_at),
    channelsDelivered: parsed.channels_delivered,
  });
}

export function toNotification(row: unknown): Notification | null {
  const parsed = parseRow(rowSchema, row);

  return parsed === null ? null : toEntity(parsed);
}

export function toNotifications(rows: readonly unknown[]): readonly Notification[] {
  return parseRows(rowSchema, rows).map(toEntity);
}

export function toNotificationRow(notification: Notification): Readonly<Record<string, unknown>> {
  return {
    id: notification.id,
    profile_id: notification.profileId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    severity: notification.severity,
    payload: notification.payload,
    scheduled_for: notification.scheduledFor.toISOString(),
    sent_at: notification.sentAt === null ? null : notification.sentAt.toISOString(),
    read_at: notification.readAt === null ? null : notification.readAt.toISOString(),
    channels_delivered: [...notification.channelsDelivered],
  };
}
