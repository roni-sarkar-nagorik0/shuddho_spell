'use client';

import { useTranslations } from 'next-intl';
import { type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Breadcrumb } from './breadcrumb';
import { SessionTimer } from './session-timer';

export interface ITopBarProps {
  readonly displayName: string;
  /** `null` when the streak is broken — shown as a zero, never hidden. */
  readonly streakDays: number;
}

/** Two initials at most. A three-letter monogram is unreadable at 24px. */
function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter((part) => part !== '');
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') === '' ? '?' : letters.join('');
}

/**
 * 48px, and nothing in it is decorative: breadcrumb, time on task, streak,
 * bell, avatar — the five things a learner checks without leaving the page.
 *
 * The avatar is a monogram, not a photograph. Google returns a picture URL and
 * rendering it would put a third-party host in the CSP for a 24px circle.
 */
export function TopBar({ displayName, streakDays }: ITopBarProps): ReactElement {
  const t = useTranslations('shell');

  return (
    <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-hairline bg-surface px-3 sm:gap-4 sm:px-4">
      {/*
        `min-w-0` and a truncate, because a breadcrumb is the one item here that
        has no length limit. Without it the trail keeps its intrinsic width, the
        row overflows, and on a 375px screen the timer and the streak are drawn
        on top of the page name — which is exactly what happened.
      */}
      <div className="min-w-0 flex-1 truncate">
        <Breadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/*
          Time on task and the streak are context, not controls: they are the
          first things to go when the row cannot hold everything. The streak is
          still on the dashboard, where it has a whole panel.
        */}
        <span className="hidden sm:block">
          <SessionTimer label={t('session')} />
        </span>

        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="label">{t('streak')}</span>
          <span className="num text-neutral-700">{streakDays}</span>
        </span>

        <NotificationBell />

        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-medium text-primary-900"
        >
          {initials(displayName)}
        </span>
        <span className="sr-only">{t('signedInAs', { name: displayName })}</span>

        {/*
          A plain form post, for the same reason `/login`'s button is one: the
          route it hits is a server route holding an httpOnly cookie, so there
          is nothing for a client to call. It is a form rather than a link
          because signing out is destructive and a link is something a prefetch
          can follow on the learner's behalf.
        */}
        <form action="/auth/signout" method="post">
          <button
            className="flex h-8 items-center gap-1.5 rounded-control px-2 text-muted hover:bg-primary-50"
            type="submit"
          >
            <Glyph name="sign-out" size={16} />
            <span className="text-label uppercase max-sm:sr-only">{t('signOut')}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
