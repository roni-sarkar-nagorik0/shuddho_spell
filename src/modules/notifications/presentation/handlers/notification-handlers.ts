import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { type GetNotificationPreferencesUseCase } from '../../application/use-cases/get-notification-preferences';
import { type ListNotificationsUseCase } from '../../application/use-cases/list-notifications';
import { type MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read';
import { type MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read';
import { type RegisterPushSubscriptionUseCase } from '../../application/use-cases/register-push-subscription';
import { type RevokePushSubscriptionUseCase } from '../../application/use-cases/revoke-push-subscription';
import { type UpdateNotificationPreferencesUseCase } from '../../application/use-cases/update-notification-preferences';
import {
  notificationParamsSchema,
  subscribePushBodySchema,
  unsubscribePushBodySchema,
  updatePreferencesBodySchema,
  type INotificationParams,
  type SubscribePushBody,
  type UnsubscribePushBody,
  type UpdatePreferencesBody,
} from '../dto/notification-requests';
import { toApiError } from './notification-errors';

type Handler = (request: NextRequest, context?: IRouteContext) => Promise<NextResponse>;

/**
 * Seven handlers, one shape.
 *
 * Every one of them takes the learner from `ctx.user` and passes nothing from
 * the body that could name a different one. That is not a convention repeated
 * seven times by luck — the input interfaces have no field for it, so there is
 * nothing to pass.
 */
export function createListNotificationsHandler(useCase: () => ListNotificationsUseCase): Handler {
  return withApi(
    async ({ user }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    { rateLimit: { key: 'notifications:list', limit: 120, windowSeconds: 60 } },
  );
}

export function createMarkReadHandler(useCase: () => MarkNotificationReadUseCase): Handler {
  return withApi<undefined, undefined, INotificationParams>(
    async ({ user, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, notificationId: params.id });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      paramsSchema: notificationParamsSchema,
      rateLimit: { key: 'notifications:read', limit: 120, windowSeconds: 60 },
    },
  );
}

export function createMarkAllReadHandler(
  useCase: () => MarkAllNotificationsReadUseCase,
): Handler {
  return withApi(
    async ({ user }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    { rateLimit: { key: 'notifications:read-all', limit: 30, windowSeconds: 60 } },
  );
}

export function createGetPreferencesHandler(
  useCase: () => GetNotificationPreferencesUseCase,
): Handler {
  return withApi(
    async ({ user }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    { rateLimit: { key: 'notifications:preferences', limit: 60, windowSeconds: 60 } },
  );
}

export function createUpdatePreferencesHandler(
  useCase: () => UpdateNotificationPreferencesUseCase,
): Handler {
  return withApi<UpdatePreferencesBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, updates: body.updates });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: updatePreferencesBodySchema,
      rateLimit: { key: 'notifications:preferences-write', limit: 30, windowSeconds: 60 },
    },
  );
}

export function createSubscribePushHandler(
  useCase: () => RegisterPushSubscriptionUseCase,
): Handler {
  return withApi<SubscribePushBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: body.userAgent,
        });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: subscribePushBodySchema,
      rateLimit: { key: 'notifications:subscribe', limit: 20, windowSeconds: 60 },
    },
  );
}

export function createUnsubscribePushHandler(
  useCase: () => RevokePushSubscriptionUseCase,
): Handler {
  return withApi<UnsubscribePushBody>(
    async ({ user, body }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, endpoint: body.endpoint });
      } catch (caught: unknown) {
        throw toApiError(caught) ?? caught;
      }
    },
    {
      bodySchema: unsubscribePushBodySchema,
      rateLimit: { key: 'notifications:unsubscribe', limit: 20, windowSeconds: 60 },
    },
  );
}
