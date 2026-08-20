'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { LetterTiles } from '@/components/lesson/letter-tiles';

interface IDemoWord {
  readonly text: string;
  readonly ipa: string;
  readonly bangla: string;
  /** What a Bengali speaker actually writes instead. Shown only after an attempt. */
  readonly commonError: string;
  readonly why: string;
}

/**
 * Three words from the real corpus, each carrying a real Bengali-speaker error.
 *
 * Not chosen to be easy. `very` is the /v/ that Bangla does not have, `think`
 * the /θ/, `receive` the rule that reverses after C — if the demo used
 * forgiving words it would be advertising a different product.
 */
const WORDS: readonly IDemoWord[] = [
  {
    text: 'very',
    ipa: 'ˈveri',
    bangla: 'ভেরি',
    commonError: 'wery',
    why: 'Bangla has no /v/, so /w/ or the aspirated ভ takes its place.',
  },
  {
    text: 'think',
    ipa: 'θɪŋk',
    bangla: 'থিঙ্ক',
    commonError: 'tink',
    why: 'Bangla has no /θ/. The dental stop ট stands in and the fricative disappears.',
  },
  {
    text: 'receive',
    ipa: 'rɪˈsiːv',
    bangla: 'রিসিভ',
    commonError: 'recieve',
    why: 'I before E, except after C — and this is after C, which is exactly when it reverses.',
  },
];

/**
 * A working dictation drill on the marketing page, for a visitor with no
 * account.
 *
 * It is the **real** `LetterTiles` component, with every behaviour intact:
 * auto-advance, backspace that goes back and clears in one press, arrow
 * navigation, paste blocked, Enter to submit. A demo built from a lookalike
 * input would be advertising something the product does not do.
 *
 * **This one grades in the browser**, and it is the only thing in the product
 * that does. There is no session, no attempt row and nothing to score against —
 * the answer is right here in the bundle because the visitor is not being
 * assessed, they are being shown what the exercise feels like. Inside the
 * course the answer never leaves the server, which is the whole of
 * `08-exam-engine.md` rule 3.
 */
export function DictationDemo(): ReactElement {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const word = WORDS[index] ?? WORDS[0];

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const say = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel before speak — the same rule the lesson's audio manager holds.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);
  }, []);

  if (word === undefined) {
    return <div />;
  }

  const correct = attempt !== null && attempt.toLowerCase() === word.text.toLowerCase();
  const marks =
    attempt === null
      ? null
      : Array.from(word.text.toLowerCase()).map((letter, position) => {
          const typed = attempt[position]?.toLowerCase() ?? '';

          if (typed === '') {
            return 'missing' as const;
          }

          return typed === letter ? ('correct' as const) : ('wrong' as const);
        });

  return (
    <div className="rounded-card border border-primary-700 bg-primary-700/30 p-6">
      <p className="label text-primary-100">Try it — no account needed</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          aria-label="Play the word"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-100 text-primary-100"
          onClick={() => { say(word.text); }}
          type="button"
        >
          <Glyph name="play" size={16} />
        </button>

        {supported ? (
          <p className="text-primary-100">Press play, then spell what you hear.</p>
        ) : (
          // Firefox and some mobile browsers have no speech synthesis. Showing
          // the transcription is a fair substitute here; inside the course the
          // spelling is never shown, because that would be the answer.
          <p className="text-primary-100">
            No audio in this browser — the transcription is{' '}
            <span className="num">/{word.ipa}/</span>.
          </p>
        )}
      </div>

      <div className="mt-5">
        <LetterTiles
          disabled={attempt !== null}
          label={`Spell the word, ${String(word.text.length)} letters`}
          length={word.text.length}
          marks={marks}
          onSubmit={setAttempt}
          resetKey={word.text}
        />
      </div>

      {attempt === null ? (
        <p className="mt-4 text-[11px] text-primary-100">
          Backspace goes back and clears in one press. Arrows move between tiles. Enter submits.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <p className={correct ? 'text-mastered' : 'text-secondary-500'}>
            {correct ? 'Correct.' : `Not quite — it is ${word.text}.`}
          </p>
          <p className="text-primary-100">
            <span className="num">/{word.ipa}/</span>{' '}
            <span className="font-bengali" lang="bn">
              {word.bangla}
            </span>
          </p>
          <p className="text-[11px] text-primary-100">
            Most Bengali speakers write <span className="font-mono">{word.commonError}</span>.{' '}
            {word.why}
          </p>

          <div>
            <button
              className="mt-2 h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
              onClick={() => {
                setAttempt(null);
                setIndex((position) => (position + 1) % WORDS.length);
              }}
              type="button"
            >
              Next word
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
