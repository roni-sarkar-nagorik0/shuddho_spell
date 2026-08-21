/**
 * The three things a visitor does with the demo panel, none of which a type
 * checker can see.
 *
 * All three were reported as the same complaint — that the panel "doesn't do
 * anything" between words — and all three are behaviour rather than shape:
 *
 * - Getting a word right must leave focus somewhere **Enter still works**.
 *   Before this, the tiles went dead on a correct answer and the visitor's
 *   hands were on a keyboard that did nothing.
 * - A word the visitor asked for must **speak itself**. A dictation drill that
 *   opens in silence charges a click for a sound there is only one of.
 * - The word the page **loaded with** must not, because a page that talks the
 *   moment it renders is what every autoplay policy exists to stop.
 *
 * The speech engine is a fake rather than a spy on the real one: jsdom has no
 * `speechSynthesis` at all, so without it the component takes its unsupported
 * branch and every assertion below would be about the wrong panel.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ISpoken {
  readonly text: string;
  readonly rate: number;
}

const spoken: ISpoken[] = [];

class FakeUtterance {
  lang = '';
  rate = 1;
  voice: unknown = null;

  constructor(readonly text: string) {}
}

beforeEach(() => {
  spoken.length = 0;

  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', {
    cancel: () => undefined,
    getVoices: () => [],
    speak: (utterance: FakeUtterance) => {
      spoken.push({ text: utterance.text, rate: utterance.rate });
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock('@/lib/auth/session-context', () => ({ useSession: () => null }));

const fetched: { next: unknown } = { next: null };

vi.mock('@/lib/api/client', () => ({
  apiFetch: (path: string) =>
    path === '/api/v1/demo/word'
      ? Promise.resolve(fetched.next)
      : Promise.reject(new Error(`unexpected ${path}`)),
}));

const { DictationDemo } = await import('./dictation-demo');

const HAND = {
  id: 'w-hand',
  text: 'hand',
  ipa: 'hænd',
  banglaSound: 'হ্যান্ড',
  banglaMeaning: 'হাত',
  commonError: 'hend',
  sentence: {
    id: 's-1',
    english: 'The book is in my hand.',
    bangla: 'বইটি আমার হাতে।',
    note: null,
  },
};

const FOOT = { ...HAND, id: 'w-foot', text: 'foot', commonError: 'fut', sentence: null };

/**
 * Types the answer into the tiles and presses Enter, as a visitor would.
 *
 * `Array.from` rather than a spread: the linter's objection to decomposing a
 * string is right in general, and these answers are ASCII only because the
 * corpus filter says so — one tile is one `char` here by construction.
 */
function spell(answer: string): void {
  const tiles = screen.getAllByRole('textbox');
  const letters = Array.from(answer);

  for (const [index, letter] of letters.entries()) {
    const tile = tiles[index];

    if (tile !== undefined) {
      fireEvent.change(tile, { target: { value: letter } });
    }
  }

  const last = tiles[letters.length - 1] ?? tiles[0];

  if (last !== undefined) {
    fireEvent.keyDown(last, { key: 'Enter' });
  }
}

/** A grammar-lesson example: longer, no Bangla, and a note in its place. */
const LESSON = {
  ...HAND,
  sentence: {
    id: 'day-4-1-0',
    english: 'She held the letter in her left hand all morning.',
    bangla: null,
    note: 'the whole phrase is one object',
  },
};

describe('the dictation demo', () => {
  it('says nothing on its own when the page loads', () => {
    render(<DictationDemo initialWord={HAND} />);

    expect(spoken).toEqual([]);
  });

  it('moves focus to Next word once the answer is right, so Enter advances', async () => {
    render(<DictationDemo initialWord={HAND} />);
    spell('hand');

    const next = await screen.findByRole('button', { name: 'Next word' });

    await waitFor(() => {
      expect(document.activeElement).toBe(next);
    });
  });

  it('speaks a word the visitor asked for, without a second click', async () => {
    fetched.next = FOOT;
    render(<DictationDemo initialWord={HAND} />);
    spell('hand');

    fireEvent.click(await screen.findByRole('button', { name: 'Next word' }));

    await waitFor(() => {
      expect(spoken.map((entry) => entry.text)).toContain('foot');
    });
  });

  it('shows the word in a sentence once it is right, with the word picked out', async () => {
    render(<DictationDemo initialWord={HAND} />);
    spell('hand');

    expect(await screen.findByText('In a sentence')).toBeTruthy();
    expect(screen.getByText('বইটি আমার হাতে।')).toBeTruthy();

    // The word itself, in its own element — not the whole sentence in one node.
    const marked = screen.getByText('hand', { selector: 'strong' });
    expect(marked.textContent).toBe('hand');
  });

  it('plays the sentence faster than the single word', async () => {
    render(<DictationDemo initialWord={HAND} />);
    spell('hand');

    fireEvent.click(await screen.findByRole('button', { name: 'Play the sentence' }));

    const sentence = spoken.at(-1);
    expect(sentence?.text).toBe('The book is in my hand.');

    // The point of having two rates at all: a lone word is slowed because there
    // is no context to recover it from, a sentence is not because the context
    // is the thing being demonstrated.
    fireEvent.click(screen.getByRole('button', { name: 'Play the word' }));
    expect(spoken.at(-1)?.rate).toBeLessThan(sentence?.rate ?? 0);
  });

  it('shows the lesson’s note when the sentence has no Bangla', async () => {
    render(<DictationDemo initialWord={LESSON} />);
    spell('hand');

    expect(await screen.findByText('In a sentence')).toBeTruthy();
    expect(screen.getByText(/the whole phrase is one object/u)).toBeTruthy();

    // And no empty Bangla line inside that panel pretending there is a
    // translation. Scoped to the panel: the word's own `banglaSound` is a
    // `lang="bn"` element too, and it is a different claim.
    const panel = screen.getByText('In a sentence').closest('div')?.parentElement;
    expect(panel?.querySelector('[lang="bn"]')).toBeNull();
  });

  it('omits the sentence row rather than inventing one', async () => {
    render(<DictationDemo initialWord={FOOT} />);
    spell('foot');

    expect(await screen.findByText('Meaning')).toBeTruthy();
    expect(screen.queryByText('In a sentence')).toBeNull();
  });

  it('leaves the tiles live after a wrong answer', () => {
    render(<DictationDemo initialWord={HAND} />);
    spell('hend');

    expect(screen.getAllByRole('textbox').every((tile) => !(tile as HTMLInputElement).disabled)).toBe(
      true,
    );
    expect(screen.queryByRole('button', { name: 'Next word' })).toBeNull();
  });
});
