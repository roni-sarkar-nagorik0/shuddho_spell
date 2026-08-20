import { type ReactElement, type ReactNode } from 'react';
import { requireUser } from '@/lib/auth/current-user';

/**
 * Focus mode — the lesson, and nothing else.
 *
 * No rail, no breadcrumb, no notification bell. `13-frontend.md` calls the
 * lesson "focus mode" and the point of it is that there is nowhere to click
 * except forward: a learner three minutes into dictation should not be one
 * stray glance away from the library.
 *
 * `requireUser()` here as well as in the page, for the reason the learn layout
 * gives — Next renders layouts and pages in parallel, so a layout that trusted
 * its child to authenticate would paint before anything checked.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function FocusLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactElement> {
  await requireUser();

  return <div className="min-h-screen bg-neutral-50">{children}</div>;
}
