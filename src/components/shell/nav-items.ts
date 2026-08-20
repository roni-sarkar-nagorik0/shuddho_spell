import { type GlyphName } from '@/components/icons/glyph';

export interface INavItem {
  readonly href: string;
  /** Key under `nav` in the message catalogues. */
  readonly labelKey: string;
  readonly glyph: GlyphName;
}

/**
 * The rail, in the order a learner meets these screens: today's work, the plan,
 * the drills, the weaknesses, the reference, the record, the exams.
 *
 * The hrefs point at routes Phase 11 and Phase 12 build. That is deliberate and
 * is not scaffolding ahead: a navigation rail with no destinations is not the
 * feature. Nothing here creates a stub page — an unbuilt route 404s honestly
 * until its own feature lands.
 */
export const NAV_ITEMS: readonly INavItem[] = Object.freeze([
  { href: '/dashboard', labelKey: 'dashboard', glyph: 'home' },
  { href: '/program', labelKey: 'program', glyph: 'program' },
  { href: '/practice', labelKey: 'practice', glyph: 'practice' },
  { href: '/weak-spots', labelKey: 'weakSpots', glyph: 'weak-spots' },
  { href: '/library', labelKey: 'library', glyph: 'library' },
  { href: '/progress', labelKey: 'progress', glyph: 'progress' },
  { href: '/exams', labelKey: 'exams', glyph: 'exam' },
]);

/**
 * The rail item only an admin sees.
 *
 * Separate from `NAV_ITEMS` rather than filtered out of it, because it is not
 * one of "the screens a learner meets in order" — it is a different job on the
 * same application. Hiding it is a courtesy, not a control: `/admin` and both
 * endpoints behind it check the caller's role against the database.
 */
export const ADMIN_ITEM: INavItem = Object.freeze({
  href: '/admin',
  labelKey: 'admin',
  glyph: 'weak-spots',
});

export const SETTINGS_ITEM: INavItem = Object.freeze({
  href: '/settings/notifications',
  labelKey: 'settings',
  glyph: 'settings',
});

/**
 * Longest-prefix match, so `/exams/attempt/abc` still lights `Exams` and
 * `/dashboard` does not light every route beginning with a slash.
 */
export function activeHref(pathname: string, items: readonly INavItem[]): string | null {
  const matches = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length);

  return matches[0]?.href ?? null;
}
