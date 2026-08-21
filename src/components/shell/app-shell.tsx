'use client';

import { useCallback, useState, type ReactElement, type ReactNode } from 'react';
import { ToastProvider } from '@/components/overlays/toast';
import { Sidebar } from './sidebar';
import { sidebarCookieValue } from './sidebar-preference';
import { TopBar } from './top-bar';

export interface IAppShellProps {
  /** Read from the cookie by the layout, so the first paint is already correct. */
  readonly initialCollapsed: boolean;
  readonly displayName: string;
  readonly streakDays: number;
  /** Decided by the layout from the session. Adds the Admin link to the rail. */
  readonly isAdmin: boolean;
  readonly children: ReactNode;
}

/**
 * Rail, top bar, content region — the frame every signed-in screen sits inside.
 *
 * The content region is the ruled-paper surface at `max-w-content` on a
 * 12-column grid. Everything a page renders is a child of that grid, so a panel
 * asks for `col-span-4` and lands on the same columns on every screen. The
 * paper is on the scrolling region rather than the page, so the rules run past
 * the bottom of short content instead of stopping halfway down the viewport.
 *
 * The skip link is first in the tab order and is the reason `#content` carries
 * `tabIndex={-1}`: without it, focus moves to the region but the next Tab
 * starts from the top of the document again in several browsers.
 *
 * **`fixed inset-0`, not `h-screen`.** The two look equivalent — both are one
 * viewport tall — and they are not. `h-screen` sizes the shell correctly but
 * leaves it *in the page*, so anything else that ends up in `<body>` gives the
 * document height the shell has to share. When that happens the window scrolls,
 * and the window scrolling takes the rail and the top bar with it: the learner
 * drags the rail off the top of the screen and lands on a band of empty page
 * background below it. `overflow-hidden` here does not help — it governs what
 * the shell clips, not whether the page around it moves.
 *
 * On a short screen nobody notices, because there is nothing to scroll. It took
 * a 2,500px grammar lesson for it to be visible, and it was never about that
 * page: in development Next mounts its own overlay node into `<body>` beside
 * this one, which is exactly the stray height that starts it.
 *
 * Out of flow, the shell is the viewport and cannot be moved by anything. The
 * only scrolling region left is `#content`, which is the one that should have
 * been scrolling all along.
 */
export function AppShell({
  initialCollapsed,
  displayName,
  streakDays,
  isAdmin,
  children,
}: IAppShellProps): ReactElement {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      document.cookie = sidebarCookieValue(next);
      return next;
    });
  }, []);

  return (
    <ToastProvider>
      <div className="fixed inset-0 flex overflow-hidden bg-neutral-50">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-primary-900 focus:px-3 focus:py-2 focus:text-surface"
          href="#content"
        >
          Skip to content
        </a>

        <Sidebar collapsed={collapsed} isAdmin={isAdmin} onToggle={toggle} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar displayName={displayName} streakDays={streakDays} />

          <main className="paper flex-1 overflow-y-auto" id="content" tabIndex={-1}>
            <div className="mx-auto grid max-w-content grid-cols-12 gap-4 px-6 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
