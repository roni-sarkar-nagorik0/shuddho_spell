'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactElement } from 'react';
import { activeHref, NAV_ITEMS, SETTINGS_ITEM } from './nav-items';

/** `weak-spots` → `Weak spots`. Only ever used for a segment with no label of its own. */
function humanise(segment: string): string {
  const spaced = segment.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Section, then the segments below it.
 *
 * The first crumb is whichever nav item owns the path, so it is translated and
 * matches the rail exactly. Anything deeper is a route segment — a day number,
 * an exam code — and is shown as it appears in the URL rather than guessed at.
 * A dynamic segment that deserves a real name (a word, an exam title) gets one
 * from the page that knows it, in its own feature.
 */
export function Breadcrumb(): ReactElement {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const all = [...NAV_ITEMS, SETTINGS_ITEM];
  const href = activeHref(pathname, all);
  const item = all.find((candidate) => candidate.href === href);

  const rest =
    item === undefined
      ? pathname.split('/').filter((segment) => segment !== '')
      : pathname
          .slice(item.href.length)
          .split('/')
          .filter((segment) => segment !== '');

  return (
    <nav aria-label={t('breadcrumb')} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-neutral-700">
        {item !== undefined && (
          <li className="shrink-0 font-medium text-primary-900">{t(item.labelKey)}</li>
        )}
        {rest.map((segment, index) => (
          <li className="flex min-w-0 items-center gap-1.5" key={`${segment}-${String(index)}`}>
            <span aria-hidden="true" className="text-cold">
              /
            </span>
            <span className="truncate">{humanise(segment)}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
