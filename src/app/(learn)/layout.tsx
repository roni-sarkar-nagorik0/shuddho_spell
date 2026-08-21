import { cookies } from 'next/headers';
import { type ReactElement, type ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { isCollapsedCookie, SIDEBAR_COOKIE } from '@/components/shell/sidebar-preference';
import { readIsAdmin, readLearnerDashboard } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The frame for every signed-in screen.
 *
 * `requireUser()` here as well as in each page is not redundant: a layout that
 * trusted its children to authenticate would render the rail and the learner's
 * name before anything checked, and Next renders layouts and pages in parallel.
 *
 * The dashboard read is memoised per request in `reads.ts`, so this layout and
 * `/dashboard` share one execution rather than querying twice.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LearnLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactElement> {
  const user = await requireUser();
  const [store, dashboard, isAdmin] = await Promise.all([
    cookies(),
    readLearnerDashboard(user.userId),
    readIsAdmin(user.userId),
  ]);

  return (
    <AppShell
      displayName={dashboard.displayName}
      initialCollapsed={isCollapsedCookie(store.get(SIDEBAR_COOKIE)?.value)}
      isAdmin={isAdmin}
      streakDays={dashboard.streakIsAlive ? dashboard.currentStreak : 0}
    >
      {children}
    </AppShell>
  );
}
