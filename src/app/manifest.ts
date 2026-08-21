import { type MetadataRoute } from 'next';

/**
 * The web app manifest — what a phone stores when somebody installs this.
 *
 * The product already has a service worker (`public/sw.js`, F8.x) for push
 * notifications, so it was most of the way to installable and missing the one
 * file that says what it is called and what it looks like on a home screen.
 *
 * Two icon entries and they are not interchangeable:
 *
 * - `any` is shown as drawn, so it carries the brand's rounded square.
 * - `maskable` is cropped by the launcher to whatever shape it prefers —
 *   usually a circle — so it is full bleed with the letter well inside the 80%
 *   safe zone. Marking the rounded icon as maskable is the standard mistake:
 *   the corners get cut off and the mark ends up touching the edge.
 *
 * `display: 'standalone'` because every screen in the product is a full-height
 * application view: a browser chrome bar over the lesson player would eat the
 * space the tiles need, and the exam timer must not sit under an address bar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ShuddhoSpell',
    short_name: 'ShuddhoSpell',
    description: 'A 28-day English precision course built for Bangla speakers.',
    // The dashboard, not `/`. Somebody who installed this has an account; the
    // marketing page is not what they opened it for, and `/dashboard` redirects
    // to `/login` when the session has gone.
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // `primary-900` and `neutral-50` from `tailwind.config.ts` — the same two
    // the application shell paints, so the splash is not a colour that appears
    // nowhere else in the product.
    background_color: '#F4F6F2',
    theme_color: '#16255A',
    lang: 'bn',
    dir: 'ltr',
    categories: ['education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
