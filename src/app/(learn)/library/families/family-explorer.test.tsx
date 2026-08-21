/**
 * The family explorer, with a fake API.
 *
 * The claims worth holding are the ones that are invisible on screen and easy
 * to regress:
 *
 * - The change beside a word is printed, and printed correctly. A card without
 *   it is a list of words; the label is the entire teaching claim.
 * - Changing a filter resets the cursor. Sending `after=educate` with a new
 *   filter asks for "the families after `educate`" inside a set `educate` may
 *   not be in — the server answers page one, and the learner reads the filter
 *   as having done nothing.
 * - The unfiltered first page is never refetched. It came from the server
 *   render; asking for it again is a round trip to arrive where we already are.
 * - A failed request says so and keeps the filters. Silently showing an empty
 *   grid would read as "no such words".
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type WordFamilyPage } from './family-contracts';

interface IAsked {
  readonly path: string;
  readonly query: Readonly<Record<string, unknown>> | undefined;
}

const asked: IAsked[] = [];
let failNext = false;

vi.mock('@/lib/api/client', () => ({
  apiFetch: (path: string, options?: { readonly query?: Readonly<Record<string, unknown>> }) => {
    asked.push({ path, query: options?.query });

    if (failNext) {
      return Promise.reject(new Error('offline'));
    }

    return Promise.resolve(SECOND_PAGE);
  },
}));

vi.mock('@/lib/audio/use-speech', () => ({
  useSpeech: () => ({ supported: true, say: () => undefined }),
}));

const { FamilyExplorer } = await import('./family-explorer');

const FIRST_PAGE: WordFamilyPage = {
  families: [
    {
      root: 'happy',
      banglaMeaning: 'সুখী',
      topic: 'emotion',
      skills: ['speaking', 'writing'],
      ruleFamilyCode: 'y_to_i',
      ruleStatement: 'When a word ends in a consonant plus y, change the y to i before a suffix.',
      inCourseCount: 1,
      members: [
        {
          text: 'happiness',
          partOfSpeech: 'noun',
          inCourse: true,
          change: { kind: 'y-to-i', prefix: null, suffix: 'ness', reversesMeaning: false },
        },
        {
          text: 'unhappy',
          partOfSpeech: 'adjective',
          inCourse: false,
          change: { kind: 'suffix', prefix: 'un', suffix: null, reversesMeaning: true },
        },
      ],
    },
  ],
  nextCursor: 'happy',
  matchedFamilies: 1,
  matchedWords: 3,
  totalWords: 2299,
  totalFamilies: 412,
  topics: [
    { topic: 'emotion', families: 1, words: 3 },
    { topic: 'work', families: 2, words: 9 },
  ],
  rules: [
    {
      code: 'y_to_i',
      statement: 'When a word ends in a consonant plus y, change the y to i before a suffix.',
      families: 1,
      words: 3,
    },
  ],
};

/**
 * Pulled out rather than indexed off `FIRST_PAGE`, because indexing an array
 * yields `T | undefined` and the only way past that in an expression is an
 * assertion this project bans.
 */
const [FIRST_FAMILY] = FIRST_PAGE.families;

const SECOND_PAGE: WordFamilyPage = {
  ...FIRST_PAGE,
  families: [
    {
      ...(FIRST_FAMILY ?? { root: '', banglaMeaning: '', topic: '', skills: [], ruleFamilyCode: null, ruleStatement: null, members: [], inCourseCount: 0 }),
      root: 'work',
      members: [
        {
          text: 'worker',
          partOfSpeech: 'noun',
          inCourse: false,
          change: { kind: 'suffix', prefix: null, suffix: 'er', reversesMeaning: false },
        },
      ],
    },
  ],
  nextCursor: null,
};

beforeEach(() => {
  asked.length = 0;
  failNext = false;
});

afterEach(cleanup);

describe('the family explorer', () => {
  it('does not refetch the page the server already rendered', async () => {
    render(<FamilyExplorer initialPage={FIRST_PAGE} />);

    await waitFor(() => {
      expect(screen.getByText('happy')).toBeTruthy();
    });

    expect(asked).toEqual([]);
  });

  it('prints what each word did to the root', () => {
    render(<FamilyExplorer initialPage={FIRST_PAGE} />);

    // Not decoration: this is the same information the learner needs for every
    // other word that ends in a consonant plus y.
    expect(screen.getByText('y→i -ness')).toBeTruthy();
    expect(screen.getByText('un-')).toBeTruthy();
    expect(screen.getByText('opposite')).toBeTruthy();
  });

  it('states the rule in full, once, above the words', () => {
    render(<FamilyExplorer initialPage={FIRST_PAGE} />);

    expect(screen.getByText(/change the y to i before a suffix/u)).toBeTruthy();
  });

  it('shows the corpus size until a filter narrows it', async () => {
    render(<FamilyExplorer initialPage={FIRST_PAGE} />);

    expect(screen.getByText(/412 families · 2299 words/u)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'writing' }));

    await waitFor(() => {
      expect(screen.getByText(/1 families · 3 words match/u)).toBeTruthy();
    });
  });

  it('drops the cursor when a filter changes', async () => {
    render(<FamilyExplorer initialPage={FIRST_PAGE} />);

    fireEvent.click(screen.getByRole('button', { name: 'More families' }));

    await waitFor(() => {
      expect(asked.length).toBe(1);
    });
    expect(asked[0]?.query?.['after']).toBe('happy');

    fireEvent.click(screen.getByRole('button', { name: 'speaking' }));

    await waitFor(() => {
      expect(asked.length).toBe(2);
    });
    expect(asked[1]?.query?.['after']).toBeUndefined();
    expect(asked[1]?.query?.['skill']).toBe('speaking');
  });

  it('says a request failed rather than showing an empty shelf', async () => {
    render(<FamilyExplorer initialPage={FIRST_PAGE} />);

    failNext = true;
    fireEvent.click(screen.getByRole('button', { name: 'reading' }));

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/u)).toBeTruthy();
    });

    // The filter is still pressed — the learner's request was not thrown away.
    expect(screen.getByRole('button', { name: 'reading' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('debounces the search box but not the filter buttons', async () => {
    vi.useFakeTimers();

    try {
      render(<FamilyExplorer initialPage={FIRST_PAGE} />);

      const box = screen.getByRole('searchbox');
      fireEvent.change(box, { target: { value: 'sus' } });
      fireEvent.change(box, { target: { value: 'sust' } });
      fireEvent.change(box, { target: { value: 'sustain' } });

      expect(asked.length).toBe(0);

      await vi.advanceTimersByTimeAsync(300);
    } finally {
      vi.useRealTimers();
    }

    await waitFor(() => {
      expect(asked.length).toBe(1);
    });
    expect(asked[0]?.query?.['startsWith']).toBe('sustain');
  });
});
