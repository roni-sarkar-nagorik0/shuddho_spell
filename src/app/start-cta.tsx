'use client';

import Link from 'next/link';
import { type ReactElement } from 'react';
import { useSession } from '@/lib/auth/session-context';

export interface IStartCtaProps {
  readonly className: string;
  /** What an anonymous visitor is asked to do. */
  readonly signedOutLabel: string;
}

/**
 * The landing page's call to action, which depends on who is reading it.
 *
 * "Start free" pointing at `/login` is the right invitation for a stranger and
 * a dead end for somebody already signed in: they follow it, `/login` sends
 * them to the dashboard, and the page has spent its main control telling an
 * existing learner to do something they have already done.
 *
 * A Client Component because the answer is per-reader. `useSession()` is the
 * only way a Client Component may learn this — the value comes from
 * `SessionBoundary`, which the root layout mounts, and which read a session the
 * *server* verified. The cookie is httpOnly, so there is no other route to it,
 * and that is the point: this is a rendering decision, and nothing behind
 * `/dashboard` trusts it.
 */
export function StartCta({ className, signedOutLabel }: IStartCtaProps): ReactElement {
  const user = useSession();

  if (user === null) {
    return (
      <Link className={className} href="/login">
        {signedOutLabel}
      </Link>
    );
  }

  return (
    <Link className={className} href="/dashboard">
      Continue where you left off
    </Link>
  );
}
