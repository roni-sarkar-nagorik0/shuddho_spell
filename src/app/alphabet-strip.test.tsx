/**
 * The alphabet strip, and the one claim on it that is not decoration.
 *
 * The section's prose says "six of them spell a sound Bangla does not have",
 * and the grid marks those six. If the count and the marks ever disagree, the
 * page is making a factual claim about Bengali phonology that the data under it
 * contradicts — on the page selling a phonology course. That is the assertion
 * worth having, and it is why `LETTERS_BANGLA_LACKS` is derived rather than
 * typed into the sentence.
 *
 * The rest is the thing the section exists for: a letter that is pressed says
 * itself, in the reference accent, and shows what a Bengali speaker produces
 * instead — quoted from `content/phonemes.ts`, never composed here.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALPHABET, LETTERS_BANGLA_LACKS } from './alphabet';

const spoken: { text: string; lang: string }[] = [];

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
      spoken.push({ text: utterance.text, lang: utterance.lang });
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const { AlphabetStrip } = await import('./alphabet-strip');

function press(letter: string): void {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${letter} —`, 'u') }));
}

describe('the alphabet strip', () => {
  it('offers all twenty-six letters', () => {
    render(<AlphabetStrip />);

    expect(screen.getAllByRole('button')).toHaveLength(26);
  });

  it('counts the marked letters the same way the sentence beside them does', () => {
    // Six, from the six entries `content/phonemes.ts` records a Bengali
    // substitution for — t, d, v, z, r, w.
    expect(LETTERS_BANGLA_LACKS).toBe(6);
    expect(ALPHABET.filter((entry) => entry.substitution !== null).map((e) => e.letter)).toEqual([
      'D',
      'R',
      'T',
      'V',
      'W',
      'Z',
    ]);

    render(<AlphabetStrip />);
    expect(screen.getByText(/6 of the 26 spell a sound Bangla does not have/u)).toBeTruthy();
  });

  it('says the letter in the reference accent when it is pressed', () => {
    render(<AlphabetStrip />);
    press('W');

    expect(spoken).toEqual([{ text: 'W', lang: 'en-GB' }]);
  });

  it('shows nothing until a letter is pressed', () => {
    render(<AlphabetStrip />);

    expect(screen.queryByText('Its name')).toBeNull();
  });

  it('separates the letter’s name from the sound it spells', () => {
    render(<AlphabetStrip />);
    press('H');

    // The confusion this exists to end: H is called /eɪtʃ/ and spells /h/, and
    // a learner who cannot tell them apart writes "aitch".
    expect(screen.getByText('/eɪtʃ/')).toBeTruthy();
    expect(screen.getByText('/h/')).toBeTruthy();
  });

  it('quotes what a Bengali speaker produces instead, where there is one', () => {
    render(<AlphabetStrip />);
    press('V');

    expect(screen.getByText(/very becomes bhery/u)).toBeTruthy();
  });

  it('says nothing about substitution for a letter Bangla already has', () => {
    render(<AlphabetStrip />);
    press('M');

    expect(screen.queryByText('What happens instead')).toBeNull();
  });

  it('shows one letter at a time', () => {
    render(<AlphabetStrip />);
    press('V');
    press('M');

    expect(screen.queryByText(/very becomes bhery/u)).toBeNull();
    expect(screen.getByText('/m/')).toBeTruthy();
  });
});
