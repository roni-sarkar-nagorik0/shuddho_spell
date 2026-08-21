/**
 * Generates every application icon from one definition.
 *
 * Run with `pnpm icons`. The output is committed — this is an authoring step,
 * not part of the build, and a deploy must never depend on rasterising
 * anything. It exists so the icons can be regenerated when the mark or the
 * palette changes, rather than being five binaries nobody can reproduce.
 *
 * `next/og` does the rasterising, which is already a dependency: no `sharp`, no
 * ImageMagick, nothing new in `package.json` for five PNGs.
 *
 * The font is committed beside this script rather than fetched. Bricolage
 * Grotesque is the display face the product already loads through
 * `next/font/google`, and it is under the SIL Open Font License, which permits
 * redistribution. Fetching it at generation time would make this script fail on
 * a plane for no benefit.
 */
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Imported by path rather than as `next/og`.
 *
 * `next/og` is not in Next's package `exports`, so a bare specifier fails to
 * resolve under plain Node ESM — the file is right there and the map does not
 * mention it. The path is stable and this script is the only caller.
 *
 * @type {{ ImageResponse: new (element: unknown, options: unknown) => { arrayBuffer: () => Promise<ArrayBuffer> } }}
 */
const og = await import('../node_modules/next/og.js');
const { ImageResponse } = og;

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/** `primary-900` and `surface` from `tailwind.config.ts`. The brand, not a choice made here. */
const NAVY = '#16255A';
const WHITE = '#FFFFFF';

const font = readFileSync(join(here, 'assets', 'bricolage-grotesque-700.ttf'));

/**
 * The mark: the wordmark's initial on the brand navy — exactly what the
 * collapsed sidebar already shows, so the tab and the rail agree.
 *
 * Flat. `CLAUDE.md` §10 rules out gradients, illustration and shadow in the UI,
 * and an icon that broke that rule would be the first thing anybody sees.
 *
 * `glyphScale` and `radius` vary by target rather than being one constant:
 * Android crops a maskable icon to a circle and iOS rounds its own corners, so
 * "the same picture at five sizes" is exactly what does not work.
 */
/**
 * @param {{ size: number, glyphScale: number, radius: number }} options
 * @returns {unknown} A satori element. Deliberately opaque — this script does
 *   not model `next/og`'s JSX shape for one caller.
 */
function mark({ size, glyphScale, radius }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: NAVY,
        color: WHITE,
        fontFamily: 'Bricolage Grotesque',
        fontSize: Math.round(size * glyphScale),
        fontWeight: 700,
        letterSpacing: '-0.03em',
        borderRadius: radius,
        // Optical centring: Bricolage's cap sits high in the em box, so the
        // glyph needs pushing down rather than left where the metrics put it.
        paddingTop: Math.round(size * 0.06),
      },
      children: 'S',
    },
  };
}

/**
 * @param {string} path Relative to the repository root.
 * @param {{ size: number, glyphScale: number, radius: number }} options
 */
async function write(path, options) {
  const response = new ImageResponse(mark(options), {
    width: options.size,
    height: options.size,
    fonts: [{ name: 'Bricolage Grotesque', data: font, weight: 700, style: 'normal' }],
  });

  writeFileSync(join(root, path), Buffer.from(await response.arrayBuffer()));
  console.log(`  ${path}  ${String(options.size)}×${String(options.size)}`);
}

const ROUNDED = 0.18;

console.log('icons');

// The favicon. Next serves `src/app/icon.png` and writes the <link> itself.
// A browser never masks a favicon, so it keeps the brand's rounded square.
await write('src/app/icon.png', { size: 32, glyphScale: 0.66, radius: Math.round(32 * ROUNDED) });

// iOS. **Square, no radius** — the system rounds it, and a pre-rounded icon
// gets rounded twice and shows navy corners inside white ones.
await write('src/app/apple-icon.png', { size: 180, glyphScale: 0.6, radius: 0 });

// The manifest's ordinary icons: shown as-is, so they carry the shape.
await write('public/icon-192.png', { size: 192, glyphScale: 0.62, radius: Math.round(192 * ROUNDED) });
await write('public/icon-512.png', { size: 512, glyphScale: 0.62, radius: Math.round(512 * ROUNDED) });

// Maskable. The launcher crops to whatever shape it likes — a circle on most
// Android — so this is full bleed with the glyph inside the 80% safe zone.
// Reusing the rounded one here is the classic bug: the corners get cut and the
// letter ends up touching the edge of the circle.
await write('public/icon-maskable-512.png', { size: 512, glyphScale: 0.44, radius: 0 });
