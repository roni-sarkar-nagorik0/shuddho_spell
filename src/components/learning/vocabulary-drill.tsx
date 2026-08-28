'use client';

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { apiFetch } from '@/lib/api/client';
import { useSpeech } from '@/lib/audio/use-speech';
import { DICTATION_RATE, SENTENCE_RATE } from '@/lib/audio/voices';
import { cn } from '@/lib/cn';
import {
  shortPos,
  vocabularyDrillSchema,
  type VocabularyDrill,
  type VocabularyDrillQuestion,
} from './vocabulary-contracts';

export interface IVocabularyDrillProps {
  readonly initial: VocabularyDrill;
  /**
   * `dark` for the landing hero, `light` for a dashboard card.
   *
   * A prop rather than two components, because the two differ in six colour
   * tokens and in nothing else. A second copy would be a second place to fix
   * the next thing wrong with the keyboard order.
   */
  readonly tone: 'dark' | 'light';
  /** How many questions a fresh round asks for. */
  readonly roundSize: number;
}

const LANG = 'en-GB';

/**
 * The vocabulary drill: a word, four meanings, and the answer on the tap.
 *
 * **The same component on the front door and on the dashboard**, because it is
 * the same exercise and the two audiences want the same thing from it — a
 * visitor wants to see whether this product knows anything, and a learner
 * wants thirty seconds of vocabulary before the day's lesson. Splitting it
 * would give two screens two different bugs.
 *
 * **It marks in the browser, and nothing is stored.** The answer arrives with
 * the question (`IVocabularyDrillQuestion` says why), which is the opposite of
 * how the exam engine works and is correct here for the opposite reason: no
 * mark is at stake, and a round trip per tap on a marketing page reads as
 * broken. Nothing here writes a review item, moves a streak, or touches the
 * learner's record.
 *
 * **The word is spoken, not just printed.** That is the product: a course about
 * pronunciation whose vocabulary screen was silent would be describing itself
 * instead of being itself. The button is offered only where the browser has
 * speech synthesis — Firefox does not — and the drill is fully playable
 * without it rather than showing a control that does nothing.
 */
export function VocabularyDrill({
  initial,
  tone,
  roundSize,
}: IVocabularyDrillProps): ReactElement {
  const [drill, setDrill] = useState<VocabularyDrill>(initial);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const { supported, say } = useSpeech();

  const question = drill.questions[index];
  const finished = question === undefined;
  const dark = tone === 'dark';

  const speak = useCallback(
    (text: string) => {
      // A phrase is spoken at sentence rate and a single word at dictation
      // rate. `play down` read at 0.85 sounds like two unrelated words; a
      // single word read at 1 is over before an unfamiliar ear has it.
      say(text, text.includes(' ') ? SENTENCE_RATE : DICTATION_RATE, LANG);
    },
    [say],
  );

  const answer = useCallback(
    (option: number) => {
      if (chosen !== null || question === undefined) {
        return;
      }

      setChosen(option);

      if (option === question.answerIndex) {
        setCorrect((count) => count + 1);
      }

      // The right answer, said aloud, whether or not it was the one picked —
      // that is the half of this exercise a silent app cannot do, and it
      // matters most in the case where the learner got it wrong.
      const said = question.options[question.answerIndex];

      if (said !== undefined) {
        speak(said);
      }
    },
    [chosen, question, speak],
  );

  const next = useCallback(() => {
    setChosen(null);
    setIndex((current) => current + 1);
  }, []);

  const again = useCallback(() => {
    setLoading(true);
    setFailed(false);

    void apiFetch('/api/v1/demo/vocabulary', {
      schema: vocabularyDrillSchema,
      query: { count: roundSize },
    })
      .then((fresh) => {
        setDrill(fresh);
        setIndex(0);
        setChosen(null);
        setCorrect(0);
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [roundSize]);

  const shell = cn(
    'flex flex-col gap-4 rounded-card p-5',
    dark ? 'bg-primary-700 text-surface' : 'border border-hairline bg-surface',
  );

  if (drill.questions.length === 0) {
    return (
      <div className={shell}>
        <p className={dark ? 'text-primary-100' : 'text-muted'}>
          The vocabulary drill is unavailable just now. Everything else on this page works.
        </p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn('label', dark && 'text-primary-100')}>
          {finished ? 'Round finished' : 'Which word means the same?'}
        </p>
        <p className={cn('num text-[11px]', dark ? 'text-primary-100' : 'text-muted')}>
          {finished
            ? `${String(correct)} / ${String(drill.questions.length)}`
            : `${String(index + 1)} / ${String(drill.questions.length)}`}
        </p>
      </div>

      {finished ? (
        <Finished
          correct={correct}
          dark={dark}
          failed={failed}
          loading={loading}
          onAgain={again}
          total={drill.questions.length}
          totalEntries={drill.totalEntries}
        />
      ) : (
        <Question
          chosen={chosen}
          dark={dark}
          isLast={index === drill.questions.length - 1}
          onAnswer={answer}
          onNext={next}
          onSpeak={speak}
          question={question}
          speakable={supported}
        />
      )}
    </div>
  );
}

interface IQuestionProps {
  readonly question: VocabularyDrillQuestion;
  readonly chosen: number | null;
  readonly dark: boolean;
  readonly isLast: boolean;
  readonly speakable: boolean;
  readonly onAnswer: (option: number) => void;
  readonly onNext: () => void;
  readonly onSpeak: (text: string) => void;
}

function Question({
  question,
  chosen,
  dark,
  isLast,
  speakable,
  onAnswer,
  onNext,
  onSpeak,
}: IQuestionProps): ReactElement {
  const answered = chosen !== null;
  const right = chosen === question.answerIndex;

  /**
   * The other equivalents, shown only after the answer.
   *
   * Before it they would give the question away — `expand` and `enlarge` in a
   * list under `magnify` is the answer written twice. After it they are the
   * part worth reading: the point of the corpus is that a word rarely has
   * exactly one swap.
   */
  const alternatives = useMemo(
    () => question.synonyms.filter((synonym) => synonym !== question.options[question.answerIndex]),
    [question],
  );

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            'font-display text-3xl tracking-tight',
            dark ? 'text-surface' : 'text-primary-900',
          )}
        >
          {question.word}
        </p>
        {speakable && (
          <button
            aria-label={`Hear ${question.word}`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-control',
              dark
                ? 'bg-primary-900 text-surface hover:bg-primary-500'
                : 'border border-hairline text-primary-900 hover:bg-primary-50',
            )}
            onClick={() => {
              onSpeak(question.word);
            }}
            type="button"
          >
            <Glyph name="play" />
          </button>
        )}
        <span className={cn('num text-[11px]', dark ? 'text-primary-100' : 'text-muted')}>
          {shortPos(question.partOfSpeech)} · {question.topic}
        </span>
        {question.inCourse && (
          <span
            className={cn(
              'rounded px-1 text-[0.625rem] uppercase',
              dark ? 'bg-primary-900 text-primary-100' : 'bg-primary-100 text-primary-900',
            )}
            title="Also taught in the 28-day course"
          >
            course
          </span>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option, position) => (
          <li key={option}>
            <button
              aria-pressed={chosen === position}
              className={cn(
                'flex h-10 w-full items-center justify-between gap-2 rounded-control border px-3 text-left',
                optionTone(dark, answered, position === question.answerIndex, chosen === position),
              )}
              disabled={answered}
              onClick={() => {
                onAnswer(position);
              }}
              type="button"
            >
              <span>{option}</span>
              {answered && position === question.answerIndex && <Glyph name="check" />}
              {answered && chosen === position && position !== question.answerIndex && (
                <Glyph name="close" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/*
        `aria-live` so the verdict reaches a screen reader that never saw the
        colour change. The sentence says which word was right even when the
        answer was correct — a learner who guessed still needs to read it.
      */}
      <div aria-live="polite" className="min-h-[2.5rem]">
        {answered && (
          <p className={cn('text-sm', dark ? 'text-primary-100' : 'text-muted')}>
            <span className={right ? 'text-mastered' : 'text-tertiary-700'}>
              {right ? 'Correct — ' : 'Not this time — '}
            </span>
            <span className={dark ? 'text-surface' : 'text-primary-900'}>{question.word}</span>{' '}
            means{' '}
            <span className={dark ? 'text-surface' : 'text-primary-900'}>
              {question.options[question.answerIndex]}
            </span>
            {alternatives.length > 0 && <> · also {alternatives.join(', ')}</>}
          </p>
        )}
      </div>

      {answered && (
        <button
          className={cn(
            'h-9 self-start rounded-control px-4',
            dark ? 'bg-secondary-500 text-primary-900' : 'bg-primary-900 text-surface',
          )}
          onClick={onNext}
          type="button"
        >
          {isLast ? 'See the score' : 'Next word'}
        </button>
      )}
    </>
  );
}

/**
 * The colour of one option button.
 *
 * Extracted because the expression is four states deep — unanswered, the right
 * answer after the fact, the wrong one that was picked, and the two nobody
 * touched — times two tones. Inline it was the least readable line in the file.
 *
 * The right answer is always marked, whether or not it was chosen, and every
 * marked state carries a glyph beside the colour so the drill reads in
 * greyscale and for the eight percent of men who would otherwise see two
 * identical buttons.
 */
function optionTone(
  dark: boolean,
  answered: boolean,
  isAnswer: boolean,
  isChosen: boolean,
): string {
  if (!answered) {
    return dark
      ? 'border-primary-500 bg-primary-900 text-surface hover:border-secondary-500'
      : 'border-hairline text-primary-900 hover:border-primary-900 hover:bg-primary-50';
  }

  if (isAnswer) {
    return 'border-mastered bg-mastered/10 text-mastered';
  }

  if (isChosen) {
    return 'border-tertiary-700 bg-tertiary-700/10 text-tertiary-700';
  }

  return dark
    ? 'border-primary-500 text-primary-100 opacity-60'
    : 'border-hairline text-muted opacity-60';
}

interface IFinishedProps {
  readonly correct: number;
  readonly total: number;
  readonly totalEntries: number;
  readonly dark: boolean;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onAgain: () => void;
}

function Finished({
  correct,
  total,
  totalEntries,
  dark,
  loading,
  failed,
  onAgain,
}: IFinishedProps): ReactElement {
  return (
    <>
      <p className={cn('font-display text-3xl tracking-tight', dark ? 'text-surface' : 'text-primary-900')}>
        {correct} of {total}
      </p>
      <p className={dark ? 'text-primary-100' : 'text-muted'}>
        {correct === total
          ? `Every one. There are ${String(totalEntries)} pairs in the list — the next round draws from the rest.`
          : `The words you missed are worth more than the ones you knew. ${String(totalEntries)} pairs in the list, drawn from at random.`}
      </p>

      {failed && (
        <p className="text-sm text-tertiary-700">
          A new round could not be loaded. Try again in a moment.
        </p>
      )}

      <button
        className={cn(
          'h-9 self-start rounded-control px-4 disabled:opacity-50',
          dark ? 'bg-secondary-500 text-primary-900' : 'bg-primary-900 text-surface',
        )}
        disabled={loading}
        onClick={onAgain}
        type="button"
      >
        {loading ? 'Drawing…' : 'Another round'}
      </button>
    </>
  );
}
