// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A structural check, not a rendering one — and deliberately so.
 *
 * The bug this guards against is a **layout** bug: with `h-screen` the shell
 * stays in the page, so any stray node in `<body>` gives the document height,
 * the window scrolls, and the rail and top bar slide off the top of the screen.
 * jsdom has no layout engine — it reports every element as 0×0 — so no test in
 * this project can observe that by rendering. What can be checked is the one
 * line the behaviour depends on.
 *
 * It reads the source rather than the rendered output because the class string
 * is the whole fix, and a reader who changes it back deserves to be sent to the
 * comment above it.
 */
const source = readFileSync(join('src', 'components', 'shell', 'app-shell.tsx'), 'utf8');

describe('the app shell is the viewport, not part of the page', () => {
  it('takes its root out of flow', () => {
    expect(source).toMatch(/className="fixed inset-0 flex overflow-hidden/u);
  });

  it('does not go back to sizing itself inside the document', () => {
    expect(source).not.toMatch(/className="[^"]*\bh-screen\b/u);
  });

  it('leaves exactly one scrolling region, and it is the content', () => {
    const scrollers = source.match(/overflow-y-auto/gu) ?? [];

    expect(scrollers).toHaveLength(1);
    expect(source).toMatch(/className="paper flex-1 overflow-y-auto" id="content"/u);
  });
});
