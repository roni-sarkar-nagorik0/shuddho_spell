import { z } from 'zod';
import { apiFetch } from '@/lib/api/client';

/**
 * The browser half of push registration.
 *
 * Separate from the banner component so the banner is about *asking* and this
 * is about *doing* — and so the awkward parts (a base64url key that has to
 * become a `Uint8Array`, a permission that can be denied permanently) are in
 * one place with their reasons written down.
 */

export const PUSH_STATES = Object.freeze([
  'unsupported',
  'unconfigured',
  'default',
  'granted',
  'denied',
] as const);

export type PushState = (typeof PUSH_STATES)[number];

/**
 * What the browser will let us do, before we ask it for anything.
 *
 * `unsupported` and `denied` are both **recoverable states, not dead ends** —
 * `09-notifications.md` is explicit about the second. A denied permission
 * cannot be re-requested by script in any browser; only the learner can undo it
 * in site settings. So the UI's job is to say so, and never to render a button
 * that would do nothing.
 */
export function readPushState(vapidPublicKey: string | undefined): PushState {
  if (vapidPublicKey === undefined) {
    return 'unconfigured';
  }

  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    return 'unsupported';
  }

  return Notification.permission;
}

const subscribeResponseSchema = z.object({ endpoint: z.string(), registered: z.boolean() });

/**
 * Asks, subscribes, and tells the server.
 *
 * Returns the resulting state rather than throwing on a refusal: being told no
 * is an ordinary answer to a question, and the caller needs to render it.
 */
export async function requestPushSubscription(vapidPublicKey: string): Promise<PushState> {
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return permission === 'denied' ? 'denied' : 'default';
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();

  // Re-subscribing an already-subscribed browser is not an error and not a
  // no-op: the server row may have been cleaned up by a 410, or the device may
  // have changed hands. Sending it again is what puts it back.
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      // Required by every browser that implements this: a push nobody can read
      // is not something they will deliver.
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(vapidPublicKey),
    }));

  const json = subscription.toJSON();

  await apiFetch('/api/v1/notifications/push/subscribe', {
    method: 'POST',
    schema: subscribeResponseSchema,
    body: {
      endpoint: subscription.endpoint,
      keys: { p256dh: json.keys?.['p256dh'] ?? '', auth: json.keys?.['auth'] ?? '' },
      userAgent: navigator.userAgent.slice(0, 400),
    },
  });

  return 'granted';
}

/** Turns push off for this browser, on both sides. */
export async function revokePushSubscription(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription === null || subscription === undefined) {
    return;
  }

  // The server first: unsubscribing locally and then failing to tell the server
  // leaves a row that pushes into a void until a 410 cleans it up, which may be
  // never if the browser simply stops answering.
  await apiFetch('/api/v1/notifications/push/unsubscribe', {
    method: 'POST',
    schema: z.object({ revoked: z.boolean() }),
    body: { endpoint: subscription.endpoint },
  });

  await subscription.unsubscribe();
}

/**
 * base64url → `Uint8Array`, which is the only shape `applicationServerKey`
 * accepts.
 *
 * VAPID keys are distributed base64url-encoded and `atob` speaks base64, so the
 * two substitutions and the padding are not optional — this is the step that
 * silently produces an unusable key when it is skipped.
 */
function toApplicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), '=');
  const base64 = padded.replaceAll('-', '+').replaceAll('_', '/');
  const raw = atob(base64);

  // Typed over `ArrayBuffer` explicitly: `applicationServerKey` will not take a
  // view that might be backed by a `SharedArrayBuffer`, and the default
  // `Uint8Array` type admits one.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}
