'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { cn } from '@/lib/cn';
import { activeHref, ADMIN_ITEM, NAV_ITEMS, SETTINGS_ITEM, type INavItem } from './nav-items';

interface ISidebarProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  /** Resolved on the server by the layout. The rail never asks the client. */
  readonly isAdmin: boolean;
}

interface IRailLinkProps {
  readonly item: INavItem;
  readonly collapsed: boolean;
  readonly active: boolean;
  readonly label: string;
}

/**
 * The active item is a `primary-100` rounded square with a `primary-900` glyph
 * — the token sheet's rule. `aria-current="page"` carries the same fact to a
 * screen reader, because the fill is a colour-only cue otherwise, which
 * `12-design-system.md` forbids.
 *
 * When collapsed the label is still in the DOM, only visually hidden: the
 * accessible name has to survive the collapse, and a `title` alone is not
 * announced reliably. `sr-only` keeps it for assistive tech and out of the
 * 56px rail.
 */
function RailLink({ item, collapsed, active, label }: IRailLinkProps): ReactElement {
  return (
    <li>
      <Link
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-9 items-center gap-3 rounded-control px-2 text-neutral-700',
          'hover:bg-primary-50',
          active && 'bg-primary-100 font-medium text-primary-900',
          collapsed && 'justify-center px-0',
        )}
        href={item.href}
        title={collapsed ? label : undefined}
      >
        <Glyph name={item.glyph} size={18} />
        <span className={cn(collapsed && 'sr-only')}>{label}</span>
      </Link>
    </li>
  );
}

export function Sidebar({ collapsed, onToggle, isAdmin }: ISidebarProps): ReactElement {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const footer = isAdmin ? [ADMIN_ITEM, SETTINGS_ITEM] : [SETTINGS_ITEM];
  const current = activeHref(pathname, [...NAV_ITEMS, ...footer]);

  return (
    <nav
      aria-label={t('primary')}
      className={cn(
        'flex shrink-0 flex-col border-r border-hairline bg-surface',
        collapsed ? 'w-rail' : 'w-sidebar',
      )}
    >
      <div
        className={cn(
          'flex h-topbar shrink-0 items-center border-b border-hairline',
          collapsed ? 'justify-center px-0' : 'px-3',
        )}
      >
        <Link className="font-display text-sm font-semibold text-primary-900" href="/dashboard">
          {collapsed ? 'S' : 'ShuddhoSpell'}
        </Link>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => (
          <RailLink
            active={current === item.href}
            collapsed={collapsed}
            item={item}
            key={item.href}
            label={t(item.labelKey)}
          />
        ))}
      </ul>

      <ul className="flex flex-col gap-0.5 border-t border-hairline p-2">
        {footer.map((item) => (
          <RailLink
            active={current === item.href}
            collapsed={collapsed}
            item={item}
            key={item.href}
            label={t(item.labelKey)}
          />
        ))}
      </ul>

      {/*
        The toggle lives at the bottom of the rail and is a real button, so it
        is in the tab order between the last nav link and the content region.
        `aria-expanded` is the state; the label changes with it rather than
        staying a static "toggle sidebar", which tells the learner nothing about
        what pressing it will do.
      */}
      <div className={cn('border-t border-hairline p-2', collapsed && 'flex justify-center')}>
        <button
          aria-expanded={!collapsed}
          className={cn(
            'flex h-8 items-center gap-2 rounded-control px-2 text-muted hover:bg-primary-50',
            collapsed ? 'w-8 justify-center px-0' : 'w-full',
          )}
          onClick={onToggle}
          type="button"
        >
          <Glyph name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
          <span className={cn('text-label uppercase', collapsed && 'sr-only')}>
            {collapsed ? t('expand') : t('collapse')}
          </span>
        </button>
      </div>
    </nav>
  );
}
