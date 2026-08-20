import { z } from 'zod';
import { LIVE_CHANNELS } from '../../domain/value-objects/notification-channel';
import { NOTIFICATION_TYPES } from '../../domain/value-objects/notification-type';

const CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/u;

const clockTimeSchema = z.string().regex(CLOCK_TIME, 'must be HH:MM').nullable();

/**
 * **The channel enum here is `LIVE_CHANNELS`, not `NOTIFICATION_CHANNELS`.**
 *
 * A body asking to configure `email` fails validation with a 422 naming the
 * field, rather than being accepted and silently ignored. While the app sends
 * no email that is the honest answer: the request cannot be honoured, and
 * pretending otherwise would have a client showing a toggle that does nothing.
 *
 * As everywhere, no schema here declares an identity field. Which learner's
 * preferences these are comes from the verified session.
 */
export const updatePreferencesBodySchema = z.object({
  updates: z
    .array(
      z
        .object({
          type: z.enum(NOTIFICATION_TYPES),
          channel: z.enum(LIVE_CHANNELS),
          enabled: z.boolean(),
          quietHoursStart: clockTimeSchema,
          quietHoursEnd: clockTimeSchema,
          reminderTime: clockTimeSchema,
        })
        // 005 refuses half a window and so does the entity; catching it here
        // makes it a 422 that names the field instead of a 500 from the domain.
        .refine(
          (update) => (update.quietHoursStart === null) === (update.quietHoursEnd === null),
          { message: 'quiet hours are set as a pair or not at all', path: ['quietHoursStart'] },
        ),
    )
    .min(1)
    .max(32),
});

export type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;

/**
 * A push subscription exactly as `PushSubscription.toJSON()` gives it, minus
 * the fields nobody needs. There is no `profileId`: the browser does not get to
 * say whose subscription this is.
 */
export const subscribePushBodySchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(200) }),
  userAgent: z.string().max(400).nullable(),
});

export type SubscribePushBody = z.infer<typeof subscribePushBodySchema>;

export const unsubscribePushBodySchema = z.object({ endpoint: z.string().url().max(1000) });

export type UnsubscribePushBody = z.infer<typeof unsubscribePushBodySchema>;

export const notificationParamsSchema = z.object({ id: z.string().uuid() });

export interface INotificationParams {
  readonly id: string;
}

const _paramsMatch: z.ZodType<INotificationParams> = notificationParamsSchema;
void _paramsMatch;
