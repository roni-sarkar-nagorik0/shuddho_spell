import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * These screens are big — one lesson is over a hundred elements — and React 19
 * commits on a scheduler task rather than inline. Without an explicit unmount
 * between tests, that commit can land after vitest has torn the jsdom down,
 * which surfaces as an unhandled `instanceof` error against a window that no
 * longer exists. The tests pass either way, which is exactly why it is worth
 * removing: an unexplained error next to a green run trains you to ignore both.
 */
afterEach(() => {
  cleanup();
});

/**
 * The two grammar screens, rendered.
 *
 * `reads.ts` is mocked because it is `server-only` and imports the container,
 * which parses the environment and opens a database handle — neither of which
 * exists in jsdom. What replaces it is not a stub of the data: it is the same
 * wiring `reads.ts` itself delegates to, so these tests render the course that
 * ships rather than a fixture that can drift from it.
 */
vi.mock('@/lib/auth/current-user', () => ({
  requireUser: () => Promise.resolve({ userId: 'user-1' }),
}));

vi.mock('@/composition/reads', async () => {
  const { grammarLesson, grammarSyllabus } = await import('@/composition/grammar');

  return { readGrammarSyllabus: grammarSyllabus, readGrammarLesson: grammarLesson };
});

const notFoundCalls = { count: 0 };

vi.mock('next/navigation', () => ({
  notFound: () => {
    notFoundCalls.count += 1;
    throw new Error('NEXT_NOT_FOUND');
  },
}));

const { default: GrammarPage } = await import('./page');
const { default: GrammarDayPage } = await import('./[day]/page');

describe('/grammar', () => {
  it('lists all 28 days, each linking to its own screen', async () => {
    const dom = render(await GrammarPage()).container;
    const links = [...dom.querySelectorAll('a[href^="/grammar/"]')];

    expect(links).toHaveLength(28);
    expect(links[0]?.getAttribute('href')).toBe('/grammar/1');
    expect(links[27]?.getAttribute('href')).toBe('/grammar/28');
  });

  it('shows the four weeks as four levels', async () => {
    const dom = render(await GrammarPage()).container;

    expect(dom.textContent).toContain('Week 1');
    expect(dom.textContent).toContain('Week 4');
    expect(dom.textContent).toContain('Advanced');
  });
});

describe('/grammar/[day]', () => {
  async function screen(day: string): Promise<HTMLElement> {
    return render(await GrammarDayPage({ params: Promise.resolve({ day }) })).container;
  }

  it('renders the day the user asked for, in full', async () => {
    const dom = await screen('16');

    expect(dom.textContent).toContain('"would" — the five jobs of one word');
    expect(dom.textContent).toContain('Why this matters in IELTS');
    expect(dom.textContent).toContain('Mistakes to stop making');
    expect(dom.textContent).toContain('Take these into the exam');
    expect(dom.textContent).toContain('Check yourself');
  });

  it('offers the day before and the day after', async () => {
    const dom = await screen('16');

    expect(dom.querySelector('a[href="/grammar/15"]')).not.toBeNull();
    expect(dom.querySelector('a[href="/grammar/17"]')).not.toBeNull();
  });

  it('keeps the answers hidden until they are asked for', async () => {
    const dom = await screen('3');
    const buttons = [...dom.querySelectorAll('button')].filter(
      (button) => button.textContent === 'Show the answer',
    );

    expect(buttons.length).toBeGreaterThanOrEqual(3);
    // The check for day 3 is "studies"; it must not be on screen yet.
    expect(dom.textContent).not.toContain('One person, and study ends in consonant');
  });

  it('404s on a day that does not exist', async () => {
    notFoundCalls.count = 0;

    // Called directly rather than through `render`: the component throws while
    // it is still awaiting, so there is never an element to mount, and handing
    // React a rejected render only produces noise after the test has passed.
    await expect(GrammarDayPage({ params: Promise.resolve({ day: '99' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(notFoundCalls.count).toBe(1);
  });
});
