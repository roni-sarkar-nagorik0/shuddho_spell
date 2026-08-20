import 'server-only';
import webpush, { WebPushError } from 'web-push';
import { publicEnv } from '@/lib/env.public';
import { serverEnv } from '@/lib/env.server';
import { logger } from '@/lib/logger';
import {
  type IPushMessage,
  type IPushSender,
  type PushResult,
} from '../../application/ports/push-sender';
import { type PushSubscription } from '../../domain/entities/push-subscription';
import { type IPushSubscriptionRepository } from '../../domain/repositories/push-subscription-repository';

/** 410 Gone. The browser is telling us this subscription will never work again. */
const GONE = 410;
/** 404 from some services means the same thing as 410 and is documented as such. */
const NOT_FOUND = 404;
const TOO_MANY_REQUESTS = 429;

/**
 * Web Push over VAPID, and it cleans up after itself.
 *
 * `09-notifications.md` gives the whole error policy in three lines: **410
 * deletes the subscription immediately, 429 backs off, 500 retries once,
 * nothing else.** This implements exactly that and nothing more — an adapter
 * that invented its own retry ladder would be making a product decision in
 * infrastructure.
 *
 * The deletion on 410 is the part worth being careful about. A dead endpoint is
 * the *normal* end of a browser's life: somebody cleared their site data, or
 * reinstalled. Left in the table it fails on every tick forever, so the
 * cheapest correct response is to delete it and say `expired` — never to throw,
 * because throwing would abort the rest of a batch over the least surprising
 * event in the system.
 *
 * With no VAPID keys configured, `send` reports `unconfigured` and does
 * nothing. Push being off is a valid deployment, and taking a request down over
 * a missing optional key would be worse than the silence it prevents.
 */
export class WebPushSender implements IPushSender {
  private configured: boolean | null = null;

  constructor(private readonly subscriptions: IPushSubscriptionRepository) {}

  async send(subscription: PushSubscription, message: IPushMessage): Promise<PushResult> {
    if (!this.ensureConfigured()) {
      return 'unconfigured';
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        },
        JSON.stringify({
          title: message.title,
          body: message.body,
          url: message.url,
          tag: message.tag,
        }),
      );

      return 'sent';
    } catch (caught: unknown) {
      return await this.classify(caught, subscription);
    }
  }

  private async classify(caught: unknown, subscription: PushSubscription): Promise<PushResult> {
    if (!(caught instanceof WebPushError)) {
      logger.warn({ endpoint: redact(subscription.endpoint) }, 'push failed for an unknown reason');

      return 'failed';
    }

    if (caught.statusCode === GONE || caught.statusCode === NOT_FOUND) {
      // Self-cleaning. Deliberately **not** rethrown: the caller asked us to
      // send to a browser that no longer exists, which is an outcome, not an
      // error, and the batch behind it should carry on.
      await this.subscriptions.deleteByEndpoint(subscription.endpoint);

      return 'expired';
    }

    if (caught.statusCode === TOO_MANY_REQUESTS) {
      return 'throttled';
    }

    logger.warn(
      { statusCode: caught.statusCode, endpoint: redact(subscription.endpoint) },
      'push rejected',
    );

    return 'failed';
  }

  /**
   * Sets the VAPID details once. `web-push` keeps them in module state, so
   * calling this per send would be pure ceremony — but calling it at import
   * time would make a missing optional key a boot failure, which is exactly
   * what the optionality is there to avoid.
   */
  private ensureConfigured(): boolean {
    const cached = this.configured;

    if (cached !== null) {
      return cached;
    }

    const publicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = serverEnv.VAPID_PRIVATE_KEY;
    const subject = serverEnv.VAPID_SUBJECT;

    if (publicKey === undefined || privateKey === undefined || subject === undefined) {
      logger.info('push is not configured — VAPID keys absent, notifications will be in-app only');
      this.configured = false;

      return false;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;

    return true;
  }
}

/**
 * A push endpoint is a capability URL: anybody holding it can send that browser
 * a notification. It never goes in a log line whole.
 */
function redact(endpoint: string): string {
  return `${endpoint.slice(0, 40)}…`;
}
