'use client';

import { useEffect, useState } from 'react';
import {
  readPushState,
  requestPushSubscription,
  type PushState,
} from './push-subscription';

export interface IPushPermissionBannerProps {
  /**
   * The VAPID public key, passed in rather than read here.
   *
   * A Client Component cannot import `env.public` without pulling the whole
   * schema into the bundle, and the key is genuinely public — so the page hands
   * it down. `undefined` means push is not configured for this deployment and
   * the banner does not appear at all.
   */
  readonly vapidPublicKey: string | undefined;
}

/**
 * The permission prompt — **an inline banner, never a modal**.
 *
 * `09-notifications.md` gives the reason and it is not aesthetic: browsers
 * penalise sites that request notification permission from a modal on load, and
 * so do users. A permission asked for badly is a permission denied
 * permanently — no browser lets script re-request it — so this asks in place,
 * after the learner has seen the page, and only when they click.
 *
 * **A denial is a state, not a dead end.** It renders as an explanation of
 * where to undo it rather than a button that would do nothing, because a button
 * that cannot work is worse than no button.
 *
 * No emoji, no gradient, no illustration, no shadow — `CLAUDE.md` section 10.
 */
export function PushPermissionBanner({ vapidPublicKey }: IPushPermissionBannerProps) {
  // Starts as `unsupported` and is corrected on mount. Reading
  // `Notification.permission` during render would differ between the server
  // pass and the client one, which React reports as a hydration mismatch.
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setState(readPushState(vapidPublicKey));
  }, [vapidPublicKey]);

  // Nothing to ask for, nothing to fix, or already answered yes.
  if (
    dismissed ||
    state === 'granted' ||
    state === 'unsupported' ||
    state === 'unconfigured' ||
    vapidPublicKey === undefined
  ) {
    return null;
  }

  if (state === 'denied') {
    return (
      <aside
        role="status"
        className="flex items-start justify-between gap-4 border border-neutral-300 px-4 py-3 text-sm"
      >
        <p>
          Notifications are blocked for this site. To turn them on, allow notifications for
          ShuddhoSpell in your browser’s site settings — this page cannot ask again.
        </p>
        <button type="button" className="underline" onClick={() => { setDismissed(true); }}>
          Dismiss
        </button>
      </aside>
    );
  }

  return (
    <aside
      role="status"
      className="flex items-start justify-between gap-4 border border-neutral-300 px-4 py-3 text-sm"
    >
      <p>Get a reminder when your lesson is ready and when your streak is about to end.</p>

      <span className="flex shrink-0 gap-3">
        <button
          type="button"
          className="underline"
          disabled={busy}
          onClick={() => {
            setBusy(true);

            void requestPushSubscription(vapidPublicKey)
              .then(setState)
              // A failure here is a browser or a network, not the learner. It
              // leaves the banner in place so they can try again, and says
              // nothing false about permission.
              .catch(() => { setState(readPushState(vapidPublicKey)); })
              .finally(() => { setBusy(false); });
          }}
        >
          {busy ? 'Asking…' : 'Turn on notifications'}
        </button>

        <button type="button" className="underline" onClick={() => { setDismissed(true); }}>
          Not now
        </button>
      </span>
    </aside>
  );
}
