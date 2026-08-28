'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { apiFetch } from '@/lib/api/client';
import { useSpeech } from '@/lib/audio/use-speech';
import { DICTATION_RATE } from '@/lib/audio/voices';
import { cn } from '@/lib/cn';
import {
  FORM_COLUMNS,
  ruleSentence,
  verbDrillSchema,
  type VerbDrill,
  type VerbDrillQuestion,
} from './verb-contracts';

export interface IVerbDrillProps {
  readonly initial: VerbDrill;
  /** `dark` for the landing hero, `light` for a card on a page. */
  readonly tone: 'dark' | 'light';
  readonly roundSize: number;
  /** Draw fresh rounds from the hundred commonest verbs only. */
  readonly coreOnly: boolean;
}

const LANG = 'en-GB';

/**
 * The verb drill: one verb, one form asked for, four candidates.
 *
 * **Built to be answerable by somebody who does not know the answer yet.** The
 * question names the form twice — `V3` and *past participle* — because half the
 * learners who need this screen do not know which one V3 is, and a drill that
 * fails them at the vocabulary of the question has taught nothing about verbs.
 * The tense the form belongs to is on the card too: *have / has + V3*.
 *
 * **Answering reveals the whole verb, not a tick.** All five forms, the rule
 * that produced the one asked for, and the Bangla gloss where the corpus has a
 * checked one. Getting a question wrong is the moment a learner is most willing
 * to read, and a drill that spends it on a red cross has wasted it.
 *
 * **The streak is the only score.** It is not stored, it does not reach the
 * learner's record, and it resets on a wrong answer — a counter that makes the
 * next question worth answering, rather than a mark that makes it worth
 * avoiding. Nothing on this screen writes anything.
 */
export function VerbDrill({ initial, tone, roundSize, coreOnly }: IVerbDrillProps): ReactElement {
  const [drill, setDrill] = useState<VerbDrill>(initial);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const { supported, say } = useSpeech();

  const question = drill.questions[index];
  const finished = question === undefined;
  const dark = tone === 'dark';

  const answer = useCallback(
    (option: number) => {
      if (chosen !== null || question === undefined) {
        return;
      }

      setChosen(option);

      if (option === question.answerIndex) {
        setCorrect((count) => count + 1);
        setStreak((run) => {
          setBest((high) => Math.max(high, run + 1));

          return run + 1;
        });
      } else {
        setStreak(0);
      }

      // The right form, said aloud, whether or not it was the one picked. For
      // `-ed` in particular the spelling and the sound part company — `worked`
      // ends in a t — and that is the half a silent app cannot teach.
      const said = question.options[question.answerIndex];

      if (said !== undefined) {
        say(said, DICTATION_RATE, LANG);
      }
    },
    [chosen, question, say],
  );

  const again = useCallback(() => {
    setLoading(true);
    setFailed(false);

    void apiFetch('/api/v1/demo/verbs', {
      schema: verbDrillSchema,
      query: { count: roundSize, core: coreOnly ? 'true' : 'false' },
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
  }, [coreOnly, roundSize]);

  const shell = cn(
    'flex flex-col gap-4 rounded-card p-5',
    dark ? 'bg-primary-700 text-surface' : 'border border-hairline bg-surface',
  );

  if (drill.questions.length === 0) {
    return (
      <div className={shell}>
        <p className={dark ? 'text-primary-100' : 'text-muted'}>
          The verb drill is unavailable just now. Everything else on this page works.
        </p>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn('label', dark && 'text-primary-100')}>
          {finished ? 'Round finished' : 'Which form is it?'}
        </p>
        <p className={cn('num text-[11px]', dark ? 'text-primary-100' : 'text-muted')}>
          {finished
            ? `${String(correct)} / ${String(drill.questions.length)}`
            : `${String(index + 1)} / ${String(drill.questions.length)}`}
          {streak > 1 && ` · ${String(streak)} in a row`}
        </p>
      </div>

      {finished ? (
        <>
          <p
            className={cn(
              'font-display text-3xl tracking-tight',
              dark ? 'text-surface' : 'text-primary-900',
            )}
          >
            {correct} of {drill.questions.length}
          </p>
          <p className={dark ? 'text-primary-100' : 'text-muted'}>
            {best > 1 ? `Best run: ${String(best)} in a row. ` : ''}
            {drill.totalVerbs} verbs in the list, and every question draws a new one.
          </p>

          {failed && (
            <p className="text-tertiary-700">A new round could not be loaded. Try again.</p>
          )}

          <button
            className={cn(
              'h-9 self-start rounded-control px-4 disabled:opacity-50',
              dark ? 'bg-secondary-500 text-primary-900' : 'bg-primary-900 text-surface',
            )}
            disabled={loading}
            onClick={again}
            type="button"
          >
            {loading ? 'Drawing…' : 'Another round'}
          </button>
        </>
      ) : (
        <Question
          chosen={chosen}
          dark={dark}
          isLast={index === drill.questions.length - 1}
          onAnswer={answer}
          onNext={() => {
            setChosen(null);
            setIndex((current) => current + 1);
          }}
          onSpeak={(text) => {
            say(text, DICTATION_RATE, LANG);
          }}
          question={question}
          speakable={supported}
        />
      )}
    </div>
  );
}

/**
 * Where each form turns up in a sentence.
 *
 * On the question rather than in the DTO because it is a fact about English
 * tenses, not about this verb, and shipping the same four strings with every
 * question would be paying for them 998 times.
 */
const USED_AS: Readonly<Record<string, string>> = {
  V2: 'yesterday I ___',
  V3: 'I have ___',
  V4: 'I am ___',
  V5: 'he / she / it ___',
};

interface IQuestionProps {
  readonly question: VerbDrillQuestion;
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

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            'font-display text-3xl tracking-tight',
            dark ? 'text-surface' : 'text-primary-900',
          )}
        >
          {question.base}
        </p>
        {speakable && (
          <button
            aria-label={`Hear ${question.base}`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-control',
              dark
                ? 'bg-primary-900 text-surface hover:bg-primary-500'
                : 'border border-hairline text-primary-900 hover:bg-primary-50',
            )}
            onClick={() => {
              onSpeak(question.base);
            }}
            type="button"
          >
            <Glyph name="play" />
          </button>
        )}
        {question.banglaMeaning !== null && (
          <span className={cn('font-bengali', dark ? 'text-primary-100' : 'text-muted')} lang="bn">
            {question.banglaMeaning}
          </span>
        )}
        {question.isIrregular && (
          <span
            className={cn(
              'rounded-chip px-1 text-[0.625rem] uppercase',
              dark ? 'bg-primary-900 text-secondary-300' : 'bg-secondary-100 text-secondary-700',
            )}
          >
            irregular
          </span>
        )}
      </div>

      {/* The question, said twice on purpose — the code and the English. */}
      <p className={dark ? 'text-primary-100' : 'text-muted'}>
        <span className={cn('num', dark ? 'text-surface' : 'text-primary-900')}>
          {question.target}
        </span>{' '}
        — the {question.targetName}:{' '}
        <span className="italic">{USED_AS[question.target] ?? question.targetName}</span>
      </p>

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

      <div aria-live="polite" className="flex flex-col gap-3">
        {answered && (
          <>
            <p className={dark ? 'text-primary-100' : 'text-muted'}>
              <span className={right ? 'text-mastered' : 'text-tertiary-700'}>
                {right ? 'Correct. ' : 'Not this time. '}
              </span>
              {ruleSentence(question.rule)}
            </p>

            {/* The whole verb, because this is the moment it will be read. */}
            <ul
              className={cn(
                'grid grid-cols-5 gap-1 rounded-control border p-2',
                dark ? 'border-primary-500' : 'border-hairline bg-neutral-50',
              )}
            >
              {FORM_COLUMNS.map((column, position) => (
                <li className="min-w-0" key={column.key}>
                  <p className={cn('num text-[10px]', dark ? 'text-primary-100' : 'text-muted')}>
                    {column.key}
                  </p>
                  <p
                    className={cn(
                      'truncate',
                      question.forms[position] === question.options[question.answerIndex]
                        ? 'text-mastered'
                        : dark
                          ? 'text-surface'
                          : 'text-primary-900',
                    )}
                    title={question.forms[position]}
                  >
                    {question.forms[position]}
                  </p>
                </li>
              ))}
            </ul>
          </>
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
          {isLast ? 'See the score' : 'Next verb'}
        </button>
      )}
    </>
  );
}

/**
 * The colour of one option button. Four states times two tones, extracted for
 * the same reason the vocabulary drill extracts its own: inline it is the least
 * readable line in the file. Every marked state carries a glyph as well as a
 * colour, so the drill reads in greyscale.
 */
function optionTone(dark: boolean, answered: boolean, isAnswer: boolean, isChosen: boolean): string {
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

  return dark ? 'border-primary-500 text-primary-100 opacity-60' : 'border-hairline text-muted opacity-60';
}
