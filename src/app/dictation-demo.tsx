'use client';

import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { z } from 'zod';
import { Glyph } from '@/components/icons/glyph';
import { LetterTiles } from '@/components/lesson/letter-tiles';
import { apiFetch } from '@/lib/api/client';
import { DICTATION_RATE, DICTATION_SLOW_RATE, preferredVoice } from '@/lib/audio/voices';

/**
 * The client's view of `GET /api/v1/demo/word`, mirroring
 * `IDictationDemoWord`. Restated rather than imported: `src/app` may not reach
 * into a module's application layer, and a drift throws here at the boundary
 * instead of rendering `undefined` into a tile count.
 */
const demoWordSchema = z
  .object({
    text: z.string(),
    ipa: z.string(),
    banglaSound: z.string(),
    banglaMeaning: z.string(),
    commonError: z.string().nullable(),
  })
  .nullable();

export type DemoWord = z.infer<typeof demoWordSchema>;

/**
 * British, and only British.
 *
 * The panel briefly offered a choice of three. It is gone: a control asking a
 * visitor to pick an accent before they have heard a word is a decision handed
 * to someone with nothing to base it on, and it sat above the tiles taking the
 * attention the exercise needs. The course trains towards British English by
 * default — `learner_profiles.accent_preference` — so the demo speaks the
 * default and says nothing about it.
 */
const DEMO_LANG = 'en-GB';

export interface IDictationDemoProps {
  /**
   * The first word, resolved during the page's own render so the demo is
   * playable on first paint rather than after a round trip. Null when the
   * corpus has not been seeded, which the panel says out loud.
   */
  readonly initialWord: DemoWord;
}

/**
 * A working dictation drill on the marketing page, for a visitor with no
 * account.
 *
 * It is the **real** `LetterTiles` component, with every behaviour intact:
 * auto-advance, backspace that goes back and clears in one press, arrow
 * navigation, paste blocked, Enter to submit. A demo built from a lookalike
 * input would be advertising something the product does not do.
 *
 * The words are the **real corpus**, drawn one at a time from
 * `/api/v1/demo/word`. Nothing about the pool is in this bundle: the landing
 * page has a performance budget, and shipping 1,240 words to every visitor to
 * show them five would be a strange way to spend it.
 *
 * **A wrong answer is not the end of the question, and neither is being told.**
 * The tiles mark which letters were wrong and the word stays hidden — the
 * visitor listens again and types again, as many times as they like. That is
 * what the exercise *is*; a demo that answered for you after one miss would be
 * showing a worse product than the one being sold.
 *
 * *Show me* reveals the spelling and **leaves the tiles live**. Reading a word
 * is not the same as being able to write it, and the moment straight after
 * being told is the one moment the visitor can. Locking the tiles there — which
 * this did at first — took away the only useful thing left to do on the
 * question. The only state that closes it is getting it right.
 *
 * **This one grades in the browser**, and it is the only thing in the product
 * that does. There is no session, no attempt row and nothing to score against —
 * the answer arrives with the word because the visitor is not being assessed,
 * they are being shown what the exercise feels like. Inside the course the
 * answer never leaves the server, which is the whole of `08-exam-engine.md`
 * rule 3.
 */
export function DictationDemo({ initialWord }: IDictationDemoProps): ReactElement {
  const [word, setWord] = useState<DemoWord>(initialWord);
  const [attempt, setAttempt] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);

    return () => {
      // Navigating away must not leave a voice talking over the next page.
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const say = useCallback((text: string, rate: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel before speak, unconditionally — the same rule the lesson's audio
    // manager holds, and for the same reason: the check is the bug.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = DEMO_LANG;
    utterance.rate = rate;

    // The ranked voice, not the browser's default for the tag — the default is
    // the small offline one, which is the least intelligible on the device.
    // Read at call time: by the first click the engine has finished loading
    // even when it had not at mount.
    const voice = preferredVoice(window.speechSynthesis.getVoices(), DEMO_LANG);

    if (voice !== null) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  /** Same word, empty tiles. `round` is what resets `LetterTiles` and refocuses it. */
  const tryAgain = useCallback(() => {
    setAttempt(null);
    setRound((current) => current + 1);
  }, []);

  const nextWord = useCallback(() => {
    setLoading(true);

    void apiFetch('/api/v1/demo/word', { schema: demoWordSchema })
      .then((fetched) => {
        setAttempt(null);
        setTries(0);
        setRevealed(false);
        setRound(0);
        setWord(fetched);
      })
      // The word on screen stays. A demo that blanked itself because one fetch
      // failed would look broken; one that keeps the word the visitor is
      // already looking at simply does not advance.
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (word === null) {
    return (
      <div className="rounded-card border border-primary-700 bg-primary-700/30 p-6">
        <p className="label text-primary-100">Try it — no account needed</p>
        <p className="mt-4 text-primary-100">
          The demo is unavailable right now. The course itself is unaffected.
        </p>
      </div>
    );
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
          onClick={() => {
            say(word.text, DICTATION_RATE);
          }}
          type="button"
        >
          <Glyph name="play" size={16} />
        </button>

        {supported ? (
          <>
            <p className="text-primary-100">Press play, then spell what you hear.</p>

            {/*
              A second press, slower. One word at speaking speed is the hardest
              thing there is to catch — there is no sentence around it to
              recover a missed consonant from — and a listener who did not get
              it has nothing to do but guess.
            */}
            <button
              className="h-8 rounded-control border border-primary-100 px-3 text-primary-100"
              onClick={() => {
                say(word.text, DICTATION_SLOW_RATE);
              }}
              type="button"
            >
              Slower
            </button>
          </>
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
          // Locked by **getting it right**, and by nothing else. A wrong answer
          // leaves the tiles live because the next thing to do is type again,
          // and so does a reveal — being shown the word is when typing it is
          // worth most.
          disabled={correct}
          label={`Spell the word, ${String(word.text.length)} letters`}
          length={word.text.length}
          marks={marks}
          onSubmit={(value) => {
            setAttempt(value);
            setTries((current) => current + 1);
          }}
          resetKey={`${word.text}-${String(round)}`}
        />
      </div>

      {attempt === null && !revealed && !correct && (
        <p className="mt-4 text-[11px] text-primary-100">
          Backspace goes back and clears in one press. Arrows move between tiles. Enter submits.
        </p>
      )}

      {attempt !== null && !revealed && !correct && (
        <div className="mt-4 flex flex-col gap-3">
          {/*
            What is wrong, not what is right. The green and red tiles above have
            already said which letters landed; saying the word here would end a
            question the visitor is still working on.
          */}
          <p className="text-secondary-500">
            Not quite — the green letters are right. Listen again and fix the rest.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
              onClick={tryAgain}
              type="button"
            >
              Try again
            </button>

            <button
              className="h-9 rounded-control border border-primary-100 px-4 text-primary-100"
              onClick={() => {
                setRevealed(true);
                // Cleared, not left holding the wrong answer: the tiles stay
                // live after a reveal and the next thing to do is type the word
                // that is now on screen.
                tryAgain();
              }}
              type="button"
            >
              Show me
            </button>
          </div>
        </div>
      )}

      {(correct || revealed) && (
        <div className="mt-4 flex flex-col gap-3">
          <p className={correct ? 'text-mastered' : 'text-secondary-500'}>
            {headline(correct, revealed, tries)}{' '}
            <span className="font-display text-lg tracking-tight">{word.text}</span>
          </p>

          {/*
            The invitation, and the reason the tiles below are still live. It
            goes the moment they take it.
          */}
          {revealed && !correct && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] text-primary-100">
                {attempt === null
                  ? 'Now type it in — that is the part that sticks.'
                  : 'Not quite yet. Try it once more.'}
              </p>

              {/*
                Only once there is something to clear. The tiles are full after
                a failed attempt and every one of them holds a letter, so
                `LetterTiles` has nowhere to advance to — a visitor would have
                to backspace eight times to get another go, which is enough
                friction to end the exercise. This is that, in one press.
              */}
              {attempt !== null && (
                <button
                  className="h-8 rounded-control border border-primary-100 px-3 text-primary-100"
                  onClick={tryAgain}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/*
            Four labelled lines, not one run-on.

            This used to print `/rɪst/ রিস্ট — কব্জি` as a single row followed by
            a paragraph of grammar terminology, and a reader had no way to know
            which part was the sound, which was the meaning and which was a rule
            about a different word. The label in front of each line is the whole
            fix: nothing here is new information, it is the same four facts made
            answerable at a glance.
          */}
          <dl className="flex flex-col gap-1 text-primary-100">
            <Fact label="Sound">
              <span className="num">/{word.ipa}/</span>
              <span className="font-bengali ml-2" lang="bn">
                {word.banglaSound}
              </span>
            </Fact>

            <Fact label="Meaning">
              <span className="font-bengali" lang="bn">
                {word.banglaMeaning}
              </span>
            </Fact>

            {word.commonError !== null && (
              <Fact label="Common mistake">
                <span className="font-mono">{word.commonError}</span>
              </Fact>
            )}
          </dl>

          <div>
            <button
              className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900 disabled:opacity-60"
              disabled={loading}
              onClick={nextWord}
              type="button"
            >
              {loading ? 'Finding one…' : 'Next word'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * What the line above the word says.
 *
 * Three outcomes, and they are not the same thing: worked it out, worked it out
 * after being told, or asked to be told and has not typed it yet. A single
 * "Correct." for the first two would be flattering the second one.
 */
function headline(correct: boolean, revealed: boolean, tries: number): string {
  if (!correct) {
    return 'The word is:';
  }

  if (revealed) {
    return 'That is it —';
  }

  return tries === 1 ? 'Correct.' : `Correct — ${String(tries)} tries.`;
}

/**
 * One labelled fact. A `dt`/`dd` pair rather than two spans, because that is
 * what this is — a term and its value — and it is what makes a screen reader
 * announce "Sound, slash r i s t slash" instead of reading a wall.
 */
function Fact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="label w-28 shrink-0">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
