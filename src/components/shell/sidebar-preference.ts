/**
 * The collapse state, carried in a cookie rather than `localStorage`.
 *
 * `localStorage` can only be read after hydration, so the rail would render at
 * 232px and jump to 56px on every navigation for a learner who collapsed it —
 * a visible flash on a layout element, on every page, forever. A cookie is
 * readable in the Server Component that renders the shell, so the first paint
 * is already correct.
 *
 * Not `httpOnly` on purpose: the toggle is a client interaction and writes it
 * back itself. It carries no identity and no secret, only a width.
 */
export const SIDEBAR_COOKIE = 'shuddhospell.sidebar';

const COLLAPSED = 'collapsed';
const EXPANDED = 'expanded';

/** A year. A layout preference the learner set once should outlive the session. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isCollapsedCookie(value: string | undefined): boolean {
  return value === COLLAPSED;
}

/** The `document.cookie` string the toggle writes. */
export function sidebarCookieValue(collapsed: boolean): string {
  const state = collapsed ? COLLAPSED : EXPANDED;
  return `${SIDEBAR_COOKIE}=${state}; path=/; max-age=${String(MAX_AGE_SECONDS)}; samesite=lax`;
}
