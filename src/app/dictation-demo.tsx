'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { z } from 'zod';
import { Glyph } from '@/components/icons/glyph';
import { LetterTiles } from '@/components/lesson/letter-tiles';
import { apiFetch } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session-context';
import {
  DICTATION_RATE,
  DICTATION_SLOW_RATE,
  SENTENCE_RATE,
  SENTENCE_SLOW_RATE,
} from '@/lib/audio/voices';
import { useSpeech } from '@/lib/audio/use-speech';

/**
 * The client's view of `GET /api/v1/demo/word`, mirroring
 * `IDictationDemoWord`. Restated rather than imported: `src/app` may not reach
 * into a module's application layer, and a drift throws here at the boundary
 * instead of rendering `undefined` into a tile count.
 */
const demoWordSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    ipa: z.string(),
    banglaSound: z.string(),
    banglaMeaning: z.string(),
    commonError: z.string().nullable(),
    sentence: z
      .object({
        id: z.string(),
        english: z.string(),
        bangla: z.string().nullable(),
        note: z.string().nullable(),
      })
      .nullable(),
  })
  .nullable();

export type DemoWord = z.infer<typeof demoWordSchema>;

/**
 * What the server says about an answer once it has decided for itself.
 *
 * The demo already marked the tiles in the browser, and this does not change
 * them — it is the record's answer, not the screen's. They agree; if they ever
 * did not, the one written down is the one that counts.
 */
const attemptResultSchema = z.object({
  attemptId: z.string(),
  isCorrect: z.boolean(),
});

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
 * When a **signed-in** learner answers, the attempt is posted to
 * `/api/v1/demo/attempts` and appears on their dashboard under *Words today*,
 * counted apart from the course. An anonymous visitor is not recorded at all.
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
  const { supported, say: speak } = useSpeech();
  /**
   * How many words this panel has served. It is in the tiles' `resetKey` so
   * that drawing the *same* word twice in a row still counts as a new question:
   * without it the key would be identical, `LetterTiles` would not re-run its
   * reset effect, and the visitor would be looking at a fresh word with the old
   * word's letters still in the boxes and focus nowhere.
   */
  const [served, setServed] = useState(0);
  const nextButton = useRef<HTMLButtonElement | null>(null);
  const user = useSession();

  /** The demo's own signature — every caller here is British English. */
  const say = useCallback(
    (text: string, rate: number) => {
      speak(text, rate, DEMO_LANG);
    },
    [speak],
  );

  /**
   * Writes the attempt down — but only for somebody signed in.
   *
   * `useSession()` is the sanctioned way a Client Component learns who is here,
   * and the answer is `null` for the visitor this page mostly serves. Nothing
   * is recorded for them: there is no profile to record against, no consent to
   * record under, and 021's `profile_id` is `not null`.
   *
   * It posts what was typed and **not** whether it was right. The server loads
   * the word and asks `Word.matches`; an endpoint that believed the browser
   * would let any dashboard report a thousand perfect words.
   *
   * Fire and forget, deliberately. The exercise is the point and the record is
   * a side effect — a failed write must not interrupt somebody mid-drill, and
   * there is nothing useful to tell them about it.
   */
  const record = useCallback(
    (value: string) => {
      if (user === null || word === null) {
        return;
      }

      void apiFetch('/api/v1/demo/attempts', {
        method: 'POST',
        schema: attemptResultSchema,
        body: { wordId: word.id, submittedValue: value },
      }).catch(() => undefined);
    },
    [user, word],
  );

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
        setServed((current) => current + 1);

        // Say it, unasked.
        //
        // A dictation exercise that opens in silence asks the visitor to press
        // play before anything can happen, and that press carries no
        // information — there is only one thing to listen to. Saying it on
        // arrival makes the loop *hear, type, hear, type* instead of *click,
        // hear, type, click, hear, type*.
        //
        // Only on a word the visitor asked for. The word already on screen when
        // the page loads is **not** spoken: a page that talks the moment it
        // renders is the behaviour every browser's autoplay policy exists to
        // stop, and the visitor has not agreed to make a noise yet. Here they
        // have — this runs off their click on *Next word*, which is the user
        // gesture the speech engine wants.
        if (fetched !== null) {
          say(fetched.text, DICTATION_RATE);
        }
      })
      // The word on screen stays. A demo that blanked itself because one fetch
      // failed would look broken; one that keeps the word the visitor is
      // already looking at simply does not advance.
      .catch(() => undefined)
      .finally(() => {
        setLoading(false);
      });
  }, [say]);

  /**
   * Computed here rather than below the early return because the effect under
   * it is a hook, and a hook cannot live after a `return`. React's rule, and
   * the reason this reads slightly out of order.
   */
  const correct =
    word !== null && attempt !== null && attempt.toLowerCase() === word.text.toLowerCase();

  /**
   * Enter, twice in a row, without touching the mouse.
   *
   * Enter submits from any tile — `LetterTiles` has always done that — and the
   * moment it is right the tiles go dead, so the visitor's hands are on the
   * keyboard and the keyboard does nothing. Moving focus to *Next word* is the
   * whole fix, and it is worth noticing what it is **not**: no key handler, no
   * listener on `window`, no interpretation of Enter anywhere. A focused
   * `<button>` is activated by Enter because that is what a button is.
   *
   * So it is also correct for a screen reader — focus lands on the control that
   * says "Next word", which announces the state change rather than leaving a
   * blind visitor on a disabled input wondering what happened.
   *
   * Only on `correct`. A revealed word leaves the tiles live on purpose — being
   * shown the spelling is the moment typing it is worth most — and stealing
   * focus to a button there would take that away.
   */
  useEffect(() => {
    if (correct) {
      nextButton.current?.focus();
    }
  }, [correct]);

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

  /**
   * What the sentence buttons actually speak. Empty when there is no sentence,
   * and the buttons are not rendered in that case — but the constant is read
   * unconditionally, so it may not be `null`.
   */
  const sentenceText = word.sentence?.english ?? '';

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
            record(value);
          }}
          resetKey={`${word.text}-${String(served)}-${String(round)}`}
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

          {/*
            The word put back where it lives.

            A word said on its own is not how anybody will ever hear it. English
            runs its words together, weakens the small ones and lands the stress
            on one syllable in six, and none of that exists in a single word
            played at 0.85. This is the same word inside a real sentence at
            speaking speed — which is the accent the course is actually about.

            It is a sentence from `sentence_items`, the ones the construction
            stage builds, not one composed for the panel. There is no sentence
            for every word and this row is simply absent when there is none;
            inventing English to fill a gap on a page selling English precision
            would be the worst possible place to do it.
          */}
          {word.sentence !== null && (
            <div className="rounded-control border border-primary-700 bg-primary-900/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="label text-primary-100">In a sentence</p>

                {supported && (
                  <>
                    <button
                      aria-label="Play the sentence"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-primary-100 text-primary-100"
                      onClick={() => {
                        say(sentenceText, SENTENCE_RATE);
                      }}
                      type="button"
                    >
                      <Glyph name="play" size={12} />
                    </button>

                    <button
                      className="h-7 rounded-control border border-primary-100 px-2 text-[11px] text-primary-100"
                      onClick={() => {
                        say(sentenceText, SENTENCE_SLOW_RATE);
                      }}
                      type="button"
                    >
                      Slower
                    </button>
                  </>
                )}
              </div>

              <p className="mt-2 text-surface">
                <Highlighted sentence={word.sentence.english} word={word.text} />
              </p>

              {/*
                Bangla when the sentence has it, the lesson's note when it does
                not, and nothing when it has neither.

                The two sources genuinely differ: a corpus sentence was authored
                against a Bangla prompt, a grammar example was authored for a
                reader already inside the lesson. Printing an empty Bangla line
                for the second — or worse, translating it here — would be
                inventing the one thing on this panel nobody reviewed.
              */}
              {word.sentence.bangla !== null && (
                <p className="font-bengali mt-1 text-primary-100" lang="bn">
                  {word.sentence.bangla}
                </p>
              )}

              {word.sentence.bangla === null && word.sentence.note !== null && (
                <p className="mt-1 text-[11px] text-primary-100">
                  Notice: {word.sentence.note}
                </p>
              )}
            </div>
          )}

          <div>
            <button
              className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900 disabled:opacity-60"
              disabled={loading}
              onClick={nextWord}
              ref={nextButton}
              type="button"
            >
              {loading ? 'Finding one…' : 'Next word'}
            </button>

            {/*
              Said only once it is true. Before the answer is right the tiles
              have focus and Enter submits; after it, focus is on the button
              above and Enter draws the next word. Printing both rules at once
              would be describing a keyboard the visitor does not have yet.
            */}
            {correct && (
              <p className="mt-2 text-[11px] text-primary-100">
                Press Enter for the next word — it plays on its own.
              </p>
            )}
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

/**
 * The sentence with the word the visitor just spelled picked out.
 *
 * Whole words, not a substring replace: a naive `split(word)` would break
 * *shorthand* in half to highlight *hand*, and the visitor would be shown a
 * word that is not the word. The split keeps its separators so punctuation and
 * spacing survive exactly as authored — a sentence reassembled from tokens
 * would quietly lose its full stop.
 *
 * The comparison is case-insensitive because the word may open the sentence,
 * and `The` is still `the`.
 */
function Highlighted({
  sentence,
  word,
}: {
  readonly sentence: string;
  readonly word: string;
}): ReactElement {
  const target = word.toLowerCase();

  return (
    <>
      {sentence.split(/([^A-Za-z\u0027]+)/u).map((piece, index) =>
        piece.toLowerCase() === target ? (
          <strong className="font-semibold text-mastered" key={`${piece}-${String(index)}`}>
            {piece}
          </strong>
        ) : (
          <span key={`${piece}-${String(index)}`}>{piece}</span>
        ),
      )}
    </>
  );
}
