'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { StatusBadge } from '@/components/primitives/status-badge';
import { DICTATION_RATE, DICTATION_SLOW_RATE, preferredVoice } from '@/lib/audio/voices';

export interface IWordRowView {
  readonly wordId: string;
  readonly text: string;
  readonly ipa: string;
  readonly banglaSound: string;
  readonly tries: number;
  readonly settled: boolean;
  readonly lastAt: string;
}

export interface IWordRowsProps {
  readonly words: readonly IWordRowView[];
}

/**
 * The rows, and the only reason this is a Client Component: the play buttons.
 *
 * Everything shown is resolved on the server and handed in as props. Paging and
 * filtering are plain links on the page around it — no fetching happens here,
 * and the back button works because the page is the state.
 */
export function WordRows({ words }: IWordRowsProps): ReactElement {
  const [speaking, setSpeaking] = useState<string | null>(null);

  useEffect(
    () => () => {
      // Leaving must not leave a word talking over the next screen.
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const say = useCallback((text: string, rate: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel before speak, unconditionally — the rule the lesson's audio
    // manager holds. On a list of twenty-five, two words talking over each
    // other is what happens without this line.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = rate;

    const voice = preferredVoice(window.speechSynthesis.getVoices(), 'en-GB');

    if (voice !== null) {
      utterance.voice = voice;
    }

    utterance.onend = () => { setSpeaking(null); };
    utterance.onerror = () => { setSpeaking(null); };

    setSpeaking(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  return (
    <ul className="flex flex-col divide-y divide-hairline rounded-control border border-hairline bg-surface">
      {words.map((word) => (
        <li className="flex flex-wrap items-center gap-3 px-3 py-2.5" key={word.wordId}>
          <button
            aria-label={`Hear ${word.text}`}
            aria-pressed={speaking === word.text}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-primary-900 hover:bg-primary-50"
            onClick={() => {
              say(word.text, DICTATION_RATE);
            }}
            type="button"
          >
            <Glyph name="play" size={14} />
          </button>

          {/*
            The slow replay the demo has, on every row. A learner scanning a
            list of words they got wrong is exactly who needs it, and a single
            word at speaking speed is the hardest thing there is to catch.
          */}
          <button
            className="label h-8 shrink-0 rounded-control border border-hairline px-2 text-muted hover:bg-primary-50"
            onClick={() => {
              say(word.text, DICTATION_SLOW_RATE);
            }}
            type="button"
          >
            Slow
          </button>

          <span className="min-w-32 font-medium text-primary-900">{word.text}</span>

          {/*
            The accent written down beside the button that says it. A learner
            with no audio — a shared desk, a train, a browser with no speech
            synthesis — still gets the pronunciation.
          */}
          <span className="num text-muted">/{word.ipa}/</span>
          <span className="font-bengali text-muted" lang="bn">
            {word.banglaSound}
          </span>

          <span className="ml-auto flex items-center gap-3">
            <span className="num text-muted">{word.lastAt.slice(0, 10)}</span>
            <span className="label">
              {word.tries === 1 ? '1 try' : `${String(word.tries)} tries`}
            </span>
            <StatusBadge
              label={word.settled ? 'Right' : 'Not yet'}
              tone={word.settled ? 'passed' : 'due'}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
