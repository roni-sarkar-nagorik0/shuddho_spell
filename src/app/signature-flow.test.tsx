/**
 * The flow, end to end, with a fake microphone.
 *
 * The claims worth holding are the ones about **what is sent and what is
 * claimed**, because both are invisible on screen:
 *
 * - A typed sentence posts `sentence-written`, not `sentence`. Get that wrong
 *   and the page prints a pronunciation percentage for something nobody said —
 *   it renders beautifully and it is a lie.
 * - The request body carries a transcript and nothing else. "The server never
 *   receives audio" is a property of this object, and an assertion on its keys
 *   is the only place it can be checked.
 * - The three marks are shown separately and never averaged. Averaging is the
 *   single most misleading thing this page could do, and it is exactly the kind
 *   of "improvement" a later edit makes.
 * - A browser with no recogniser gets the self-assessment path, not a disabled
 *   button — `13-frontend.md`'s "never a dead button", which is untestable by
 *   inspection and trivial to regress.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface IPosted {
  readonly path: string;
  readonly body: Readonly<Record<string, unknown>> | undefined;
}

const posted: IPosted[] = [];
const spoken: { text: string; rate: number }[] = [];

const WORD = {
  id: '11111111-1111-4111-8111-111111111111',
  text: 'very',
  ipa: 'veri',
  banglaSound: 'ভেরি',
  banglaMeaning: 'খুব',
  commonError: 'wery',
  sentence: null,
};

const WORD_SCORE = {
  mode: 'word' as const,
  scorePercent: 68,
  transcript: 'wery',
  heard: 'wery',
  isNotHeard: false,
  isClean: false,
  diagnoses: [
    { expected: 'v', heard: 'w', articulationFix: 'Your lower lip should touch your top teeth.' },
  ],
  sentence: null,
};

const SENTENCE_SCORE = {
  mode: 'sentence-written' as const,
  scorePercent: null,
  transcript: 'The film was very good.',
  heard: '',
  isNotHeard: false,
  isClean: false,
  diagnoses: [],
  sentence: { usesTheWord: true, wordCount: 5, isSentenceLength: true },
};

vi.mock('@/lib/api/client', () => ({
  apiFetch: (path: string, options?: { readonly body?: Readonly<Record<string, unknown>> }) => {
    posted.push({ path, body: options?.body });

    if (path === '/api/v1/demo/word') {
      return Promise.resolve(WORD);
    }

    return Promise.resolve(options?.body?.['mode'] === 'word' ? WORD_SCORE : SENTENCE_SCORE);
  },
}));

class FakeUtterance {
  lang = '';
  rate = 1;
  voice: unknown = null;

  constructor(readonly text: string) {}
}

/** A recogniser the test drives, standing in for the Web Speech API. */
class FakeRecogniser {
  static last: FakeRecogniser | null = null;

  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecogniser.last = this;
  }

  start(): void {
    // The browser opens the microphone here. Nothing to do.
  }

  stop(): void {
    this.onend?.();
  }

  abort(): void {
    // Nothing retained, so nothing to release.
  }

  /** What the browser does when it has transcribed something. */
  hear(transcript: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { length: 1, isFinal: true, 0: { transcript, confidence: 0.9 } } },
    });
  }
}

beforeEach(() => {
  posted.length = 0;
  spoken.length = 0;
  FakeRecogniser.last = null;

  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', {
    cancel: () => undefined,
    getVoices: () => [],
    speak: (utterance: FakeUtterance) => {
      spoken.push({ text: utterance.text, rate: utterance.rate });
    },
  });
  vi.stubGlobal('SpeechRecognition', FakeRecogniser);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const { SignatureFlow } = await import('./signature-flow');

/** Types the answer into the tiles and submits, as a visitor would. */
function spell(answer: string): void {
  const tiles = screen.getAllByRole('textbox');
  const letters = Array.from(answer);

  for (const [index, letter] of letters.entries()) {
    const tile = tiles[index];

    if (tile !== undefined) {
      fireEvent.change(tile, { target: { value: letter } });
    }
  }

  const last = tiles[letters.length - 1];

  if (last !== undefined) {
    fireEvent.keyDown(last, { key: 'Enter' });
  }
}

/** Start, hear, spell — the three steps before the interesting ones. */
async function reachSpeakStep(): Promise<void> {
  render(<SignatureFlow />);
  fireEvent.click(screen.getByRole('button', { name: 'Start the round' }));

  fireEvent.click(await screen.findByRole('button', { name: 'Spell it' }));
  spell('very');
  fireEvent.click(await screen.findByRole('button', { name: 'Now say it' }));
}

describe('the signature flow', () => {
  it('says nothing until the visitor asks for a word', () => {
    render(<SignatureFlow />);

    expect(spoken).toEqual([]);
    expect(posted).toEqual([]);
  });

  it('plays the word off the visitor’s own click', async () => {
    render(<SignatureFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Start the round' }));

    await waitFor(() => {
      expect(spoken.map((entry) => entry.text)).toContain('very');
    });
  });

  it('does not show the spelling before it has been asked for', async () => {
    render(<SignatureFlow />);
    fireEvent.click(screen.getByRole('button', { name: 'Start the round' }));

    const listen = await screen.findByText(/The spelling is not shown/u);

    expect(listen).toBeTruthy();
    expect(screen.queryByText('very')).toBeNull();
  });

  it('posts the transcript, and only the transcript', async () => {
    await reachSpeakStep();

    fireEvent.click(await screen.findByRole('button', { name: /Press and speak/u }));
    FakeRecogniser.last?.hear('wery');

    await waitFor(() => {
      expect(posted.some((entry) => entry.path === '/api/v1/demo/speech')).toBe(true);
    });

    const call = posted.find((entry) => entry.path === '/api/v1/demo/speech');

    // No blob, no audio, no url — the constraint is the shape of this object.
    expect(Object.keys(call?.body ?? {}).sort()).toEqual(['mode', 'transcript', 'wordId']);
    expect(call?.body?.['transcript']).toBe('wery');
    expect(call?.body?.['mode']).toBe('word');
  });

  it('shows what to fix, not just a number', async () => {
    await reachSpeakStep();

    fireEvent.click(await screen.findByRole('button', { name: /Press and speak/u }));
    FakeRecogniser.last?.hear('wery');

    expect(await screen.findByText(/lower lip should touch your top teeth/u)).toBeTruthy();
    expect(screen.getByText('68%')).toBeTruthy();
  });

  it('posts a typed sentence as written, never as spoken', async () => {
    await reachSpeakStep();
    fireEvent.click(await screen.findByRole('button', { name: /Press and speak/u }));
    FakeRecogniser.last?.hear('wery');
    fireEvent.click(await screen.findByRole('button', { name: 'Now use it in a sentence' }));

    fireEvent.change(screen.getByRole('textbox', { name: /type it/iu }), {
      target: { value: 'The film was very good.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check it' }));

    await waitFor(() => {
      expect(posted.filter((entry) => entry.path === '/api/v1/demo/speech')).toHaveLength(2);
    });

    expect(posted.at(-1)?.body?.['mode']).toBe('sentence-written');
  });

  it('says plainly that grammar is not marked', async () => {
    await reachSpeakStep();
    fireEvent.click(await screen.findByRole('button', { name: /Press and speak/u }));
    FakeRecogniser.last?.hear('wery');
    fireEvent.click(await screen.findByRole('button', { name: 'Now use it in a sentence' }));

    fireEvent.change(screen.getByRole('textbox', { name: /type it/iu }), {
      target: { value: 'The film was very good.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check it' }));

    expect(await screen.findByText(/Grammar is not marked here/u)).toBeTruthy();
  });

  it('keeps the three marks apart and never averages them', async () => {
    await reachSpeakStep();
    fireEvent.click(await screen.findByRole('button', { name: /Press and speak/u }));
    FakeRecogniser.last?.hear('wery');
    fireEvent.click(await screen.findByRole('button', { name: 'Now use it in a sentence' }));

    fireEvent.change(screen.getByRole('textbox', { name: /type it/iu }), {
      target: { value: 'The film was very good.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check it' }));
    fireEvent.click(await screen.findByRole('button', { name: 'See the three marks' }));

    expect(await screen.findByText('Spelling')).toBeTruthy();
    expect(screen.getByText('Pronunciation')).toBeTruthy();
    expect(screen.getByText('Sentence')).toBeTruthy();

    // Spelled right first time, said it wrong. One number would hide that.
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('68%')).toBeTruthy();
    expect(screen.getByText(/never averaged/u)).toBeTruthy();
  });

  it('offers self-assessment rather than a dead button with no recogniser', async () => {
    vi.stubGlobal('SpeechRecognition', undefined);

    await reachSpeakStep();

    expect(await screen.findByText(/no speech recognition/u)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Press and speak/u })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'That matched' }));

    // A judgement, and said to be one — not a score.
    expect(screen.getByText(/your own judgement, not a score/u)).toBeTruthy();
  });
});
