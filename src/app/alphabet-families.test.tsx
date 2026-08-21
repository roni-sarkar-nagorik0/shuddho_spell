/**
 * The grouping, which is derived and therefore has one way to be wrong.
 *
 * A family list is defined by an ordered set of IPA nuclei, and the order is
 * load-bearing: *H* is /eɪtʃ/ and `e` is a substring of `eɪ`, so testing `e`
 * first would file *H* with *F* and *L*. Nothing about that failure is visible
 * — the page still renders seven tidy cards, and one of them is a lie about how
 * English is spoken.
 *
 * So the assertions are completeness and disjointness: every letter lands
 * somewhere, no letter lands twice, and the family that carries the product's
 * whole argument — the eight that rhyme on /iː/, three of which Bangla
 * substitutes — is spelled out rather than counted.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALPHABET } from './alphabet';
import { LETTER_FAMILIES, familyIndexOf, substitutedIn } from './letter-families';

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

const { AlphabetFamilies } = await import('./alphabet-families');

describe('the letter families', () => {
  it('places every letter, and none of them twice', () => {
    const placed = LETTER_FAMILIES.flatMap((family) => family.letters.map((l) => l.letter));

    expect(placed).toHaveLength(ALPHABET.length);
    expect(new Set(placed).size).toBe(ALPHABET.length);
  });

  it('leaves no letter unmatched by the nuclei', () => {
    // -1 means a transcription no nucleus recognised, which would silently drop
    // the letter off the page.
    const orphans = ALPHABET.filter((letter) => familyIndexOf(letter) < 0);

    expect(orphans.map((letter) => letter.letter)).toEqual([]);
  });

  it('does not let a short nucleus steal a letter from a longer one', () => {
    // H is /eɪtʃ/ and belongs with A, J, K — not with F, L, M, N, S, X, Z.
    const day = LETTER_FAMILIES.find((family) => family.nucleus === 'eɪ');

    expect(day?.letters.map((l) => l.letter)).toEqual(['A', 'H', 'J', 'K']);
  });

  it('keeps W with the letters it rhymes with, not with the schwa in its name', () => {
    // /ˈdʌbəljuː/ contains ə, and W still belongs with Q and U.
    const you = LETTER_FAMILIES.find((family) => family.nucleus === 'uː');

    expect(you?.letters.map((l) => l.letter)).toEqual(['Q', 'U', 'W']);
  });

  it('names the eight that rhyme on /iː/, and the three Bangla substitutes', () => {
    const see = LETTER_FAMILIES.find((family) => family.nucleus === 'iː');

    if (see === undefined) {
      throw new Error('the /iː/ family is gone, which is the regression this test is about');
    }

    expect(see.letters.map((l) => l.letter)).toEqual(['B', 'C', 'D', 'E', 'G', 'P', 'T', 'V']);
    expect(substitutedIn(see).map((l) => l.letter)).toEqual(['D', 'T', 'V']);
  });

  it('says one letter when a letter is pressed', () => {
    render(<AlphabetFamilies />);
    fireEvent.click(screen.getByRole('button', { name: 'Hear the letter V' }));

    expect(spoken).toEqual([{ text: 'V', lang: 'en-GB' }]);
  });

  it('says a whole family in one run, with pauses between the letters', () => {
    render(<AlphabetFamilies />);
    fireEvent.click(screen.getByRole('button', { name: 'Hear all 8 together' }));

    // One utterance, not eight — a queue would let a second click interleave
    // two families.
    expect(spoken).toEqual([{ text: 'B, C, D, E, G, P, T, V', lang: 'en-GB' }]);
  });

  it('offers no run for a family of one', () => {
    render(<AlphabetFamilies />);

    expect(screen.queryByRole('button', { name: 'Hear all 1 together' })).toBeNull();
  });

  it('writes the singular case as a singular', () => {
    render(<AlphabetFamilies />);

    // Three families hold exactly one substituted letter — W, R and Z — and one
    // holds three. The counts are what the two sentences are chosen by.
    expect(screen.getAllByText(/the one sound in this group Bangla has no equivalent for/u)).toHaveLength(3);
    expect(screen.getAllByText(/3 of these spell sounds Bangla has no equivalent for/u)).toHaveLength(1);
  });
});
