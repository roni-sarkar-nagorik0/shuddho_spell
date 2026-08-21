'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { z } from 'zod';
import { Glyph } from '@/components/icons/glyph';
import { LetterTiles } from '@/components/lesson/letter-tiles';
import { apiFetch } from '@/lib/api/client';
import { useMicrophone } from '@/components/lesson/use-microphone';
import { useSpeech } from '@/lib/audio/use-speech';
import { DICTATION_RATE, DICTATION_SLOW_RATE, SENTENCE_RATE } from '@/lib/audio/voices';

/** British, and only British — the reference accent the whole product speaks. */
const LANG = 'en-GB';

/**
 * The client's view of `GET /api/v1/demo/word`. Restated rather than imported
 * for the same reason `dictation-demo.tsx` restates it: `src/app` may not reach
 * into a module's application layer, and a drift throws here at the boundary.
 */
const wordSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    ipa: z.string(),
    banglaSound: z.string(),
    banglaMeaning: z.string(),
    commonError: z.string().nullable(),
    sentence: z
      .object({ id: z.string(), english: z.string(), bangla: z.string().nullable(), note: z.string().nullable() })
      .nullable(),
  })
  .nullable();

type FlowWord = NonNullable<z.infer<typeof wordSchema>>;

/** The client's view of `POST /api/v1/demo/speech`. */
const speechSchema = z.object({
  mode: z.enum(['word', 'sentence', 'sentence-written']),
  scorePercent: z.number().nullable(),
  transcript: z.string(),
  heard: z.string(),
  isNotHeard: z.boolean(),
  isClean: z.boolean(),
  diagnoses: z.array(
    z.object({ expected: z.string(), heard: z.string(), articulationFix: z.string() }),
  ),
  sentence: z
    .object({
      usesTheWord: z.boolean(),
      wordCount: z.number(),
      isSentenceLength: z.boolean(),
    })
    .nullable(),
});

type SpeechScore = z.infer<typeof speechSchema>;

const STEPS = ['Listen', 'Spell', 'Speak', 'Sentence'] as const;

type Step = 0 | 1 | 2 | 3 | 4;

/**
 * Hear it, spell it, say it, use it — the whole loop, on the front door.
 *
 * **This is the section that says what the product is.** A spelling app shows
 * you a word and marks the letters. This course claims something larger: that
 * the four things a word can go wrong in are one exercise, and that a Bengali
 * speaker's errors are *nameable* in each of them. That claim was previously
 * made in prose, in a table of eight misspellings, on a page where the only
 * thing a visitor could do was type. Prose is where a claim goes to be
 * disbelieved.
 *
 * So it is the real loop and not a mock-up of one:
 *
 * - **Listen** plays the word from the seeded corpus, at the dictation rate the
 *   lesson uses, with the same slower second press.
 * - **Spell** is the real `LetterTiles` — auto-advance, backspace that clears
 *   and steps back in one press, Enter to submit, paste refused.
 * - **Speak** posts the browser's *transcript* to the same `ISpeechScorer` the
 *   course's speak stage runs, and shows what came back: a score, and where a
 *   sound went, and what to do with the mouth. Not "wrong".
 * - **Sentence** takes what the visitor says and reports the three things that
 *   can honestly be established about it — that the word was used, that it was
 *   a sentence rather than a fragment, and how the word sounded inside it.
 *
 * **No audio ever leaves the browser.** The Web Speech API transcribes locally
 * and only the text is posted, which is `07-speech-scoring.md`'s hard
 * constraint and is visible in the request body.
 *
 * **Nothing is recorded.** An anonymous visitor has no profile to write
 * against; the endpoint reads and returns. The scorecard at the end lives in
 * this component's state and is gone when the tab is.
 *
 * **What it does not claim.** There is no grammar mark on the sentence step,
 * and there is a line on screen saying so. A freely spoken sentence has no
 * target to mark against — inside the course `SentenceItem.accepts` has a
 * reviewed answer and a list of accepted alternatives, and here there is
 * nothing. Printing a confident number over that absence would be the least
 * defensible thing on a page selling English precision.
 */
export function SignatureFlow(): ReactElement {
  const [word, setWord] = useState<FlowWord | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const [spelled, setSpelled] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState(0);

  const [saidWord, setSaidWord] = useState<SpeechScore | null>(null);
  const [saidSentence, setSaidSentence] = useState<SpeechScore | null>(null);
  const [selfJudged, setSelfJudged] = useState<boolean | null>(null);
  const [typedSentence, setTypedSentence] = useState('');
  const [scoring, setScoring] = useState(false);

  const { say } = useSpeech();
  const speak = useCallback(
    (text: string, rate: number) => {
      say(text, rate, LANG);
    },
    [say],
  );

  const start = useCallback(() => {
    setLoading(true);
    setFailed(false);

    void apiFetch('/api/v1/demo/word', { schema: wordSchema })
      .then((fetched) => {
        if (fetched === null) {
          setFailed(true);
          return;
        }

        setWord(fetched);
        setStep(0);
        setSpelled(null);
        setTries(0);
        setRevealed(false);
        setRound((current) => current + 1);
        setSaidWord(null);
        setSaidSentence(null);
        setSelfJudged(null);
        setTypedSentence('');

        // The visitor pressed a button to get here, so the speech engine has
        // its gesture and the word can introduce itself. The page never speaks
        // unasked — see `dictation-demo.tsx` for the same rule.
        speak(fetched.text, DICTATION_RATE);
      })
      .catch(() => { setFailed(true); })
      .finally(() => { setLoading(false); });
  }, [speak]);

  const score = useCallback(
    (transcript: string, mode: SpeechScore['mode']) => {
      if (word === null) {
        return;
      }

      setScoring(true);

      void apiFetch('/api/v1/demo/speech', {
        method: 'POST',
        schema: speechSchema,
        body: { wordId: word.id, transcript, mode },
      })
        .then((answer) => {
          if (mode === 'word') {
            setSaidWord(answer);
          } else {
            setSaidSentence(answer);
          }
        })
        .catch(() => { setFailed(true); })
        .finally(() => { setScoring(false); });
    },
    [word],
  );

  if (word === null) {
    return <Invitation failed={failed} loading={loading} onStart={start} />;
  }

  const correct = spelled !== null && spelled.toLowerCase() === word.text.toLowerCase();

  return (
    <div className="rounded-card border border-hairline bg-surface p-5 sm:p-6">
      <Rail step={step} />

      <div className="mt-6">
        {step === 0 && (
          <ListenStep onNext={() => { setStep(1); }} speak={speak} word={word} />
        )}

        {step === 1 && (
          <SpellStep
            correct={correct}
            onNext={() => { setStep(2); }}
            onReveal={() => {
              setRevealed(true);
              setSpelled(null);
              setRound((current) => current + 1);
            }}
            onRetry={() => {
              setSpelled(null);
              setRound((current) => current + 1);
            }}
            onSubmit={(value) => {
              setSpelled(value);
              setTries((current) => current + 1);
            }}
            revealed={revealed}
            round={round}
            spelled={spelled}
            speak={speak}
            tries={tries}
            word={word}
          />
        )}

        {step === 2 && (
          <SpeakStep
            onNext={() => { setStep(3); }}
            onSelfJudge={setSelfJudged}
            onTranscript={(heard) => { score(heard, 'word'); }}
            result={saidWord}
            scoring={scoring}
            selfJudged={selfJudged}
            speak={speak}
            word={word}
          />
        )}

        {step === 3 && (
          <SentenceStep
            onNext={() => { setStep(4); }}
            onTranscript={(heard, mode) => { score(heard, mode); }}
            onTyped={setTypedSentence}
            result={saidSentence}
            scoring={scoring}
            typed={typedSentence}
            word={word}
          />
        )}

        {step === 4 && (
          <Scorecard
            correct={correct}
            onAgain={start}
            revealed={revealed}
            said={saidWord}
            selfJudged={selfJudged}
            sentence={saidSentence}
            tries={tries}
            word={word}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The panel before anything has been fetched.
 *
 * A start button rather than a word already on screen, and deliberately: the
 * flow's first act is a sound, and a page that has already made one before the
 * visitor asked is the behaviour autoplay policies exist to stop.
 */
function Invitation({
  failed,
  loading,
  onStart,
}: {
  readonly failed: boolean;
  readonly loading: boolean;
  readonly onStart: () => void;
}): ReactElement {
  return (
    <div className="rounded-card border border-hairline bg-surface p-6">
      <Rail step={0} />

      <p className="mt-6 max-w-2xl text-muted">
        One word, four ways. You will hear it, spell it, say it, and put it into a sentence — and
        each of those is marked separately, because they fail separately.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-control bg-secondary-500 px-5 font-medium text-primary-900 disabled:opacity-60"
          disabled={loading}
          onClick={onStart}
          type="button"
        >
          {loading ? 'Finding a word…' : 'Start the round'}
        </button>

        <p className="text-[11px] text-muted">No account. Nothing recorded.</p>
      </div>

      {failed && (
        <p className="mt-4 text-tertiary-700">
          The demo is unavailable right now. The course itself is unaffected.
        </p>
      )}
    </div>
  );
}

/**
 * Four numbered stages, with the one in hand marked.
 *
 * `aria-current` rather than colour alone, so the position in the flow is
 * available to a screen reader as a fact rather than as a shade of blue.
 */
function Rail({ step }: { readonly step: Step }): ReactElement {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((label, index) => {
        const done = index < step;
        const here = index === step;

        return (
          <li className="flex items-center gap-2" key={label}>
            <span
              aria-current={here ? 'step' : undefined}
              className={[
                'flex h-7 items-center gap-2 rounded-control border px-3 text-[11px] uppercase tracking-wide',
                here
                  ? 'border-primary-900 bg-primary-900 text-surface'
                  : done
                    ? 'border-mastered text-mastered'
                    : 'border-hairline text-muted',
              ].join(' ')}
            >
              {done ? '✓' : index + 1} {label}
            </span>

            {index < STEPS.length - 1 && <span aria-hidden className="text-muted">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function ListenStep({
  onNext,
  speak,
  word,
}: {
  readonly onNext: () => void;
  readonly speak: (text: string, rate: number) => void;
  readonly word: FlowWord;
}): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-primary-900">
        Listen. The spelling is not shown — that is the next step’s job.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-label="Play the word"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-900 text-primary-900"
          onClick={() => { speak(word.text, DICTATION_RATE); }}
          type="button"
        >
          <Glyph name="play" size={18} />
        </button>

        <button
          className="h-9 rounded-control border border-hairline px-3 text-primary-900"
          onClick={() => { speak(word.text, DICTATION_SLOW_RATE); }}
          type="button"
        >
          Slower
        </button>

        <button
          className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
          onClick={onNext}
          type="button"
        >
          Spell it
        </button>
      </div>

      <p className="text-[11px] text-muted">
        {word.text.length} letters. If the browser has no speech synthesis, the transcription is{' '}
        <span className="num">/{word.ipa}/</span>.
      </p>
    </div>
  );
}

function SpellStep({
  correct,
  onNext,
  onReveal,
  onRetry,
  onSubmit,
  revealed,
  round,
  spelled,
  speak,
  tries,
  word,
}: {
  readonly correct: boolean;
  readonly onNext: () => void;
  readonly onReveal: () => void;
  readonly onRetry: () => void;
  readonly onSubmit: (value: string) => void;
  readonly revealed: boolean;
  readonly round: number;
  readonly spelled: string | null;
  readonly speak: (text: string, rate: number) => void;
  readonly tries: number;
  readonly word: FlowWord;
}): ReactElement {
  const marks =
    spelled === null
      ? null
      : Array.from(word.text.toLowerCase()).map((letter, position) => {
          const typed = spelled[position]?.toLowerCase() ?? '';

          if (typed === '') {
            return 'missing' as const;
          }

          return typed === letter ? ('correct' as const) : ('wrong' as const);
        });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-label="Play the word again"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-primary-900"
          onClick={() => { speak(word.text, DICTATION_RATE); }}
          type="button"
        >
          <Glyph name="play" size={14} />
        </button>

        <p className="text-primary-900">Spell what you heard.</p>
      </div>

      <LetterTiles
        disabled={correct}
        label={`Spell the word, ${String(word.text.length)} letters`}
        length={word.text.length}
        marks={marks}
        onSubmit={onSubmit}
        resetKey={`${word.text}-${String(round)}`}
      />

      {spelled !== null && !correct && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-secondary-500">
            Not quite — the green letters are right. Listen again and fix the rest.
          </p>

          <button
            className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>

          <button
            className="h-9 rounded-control border border-hairline px-4 text-primary-900"
            onClick={onReveal}
            type="button"
          >
            Show me
          </button>
        </div>
      )}

      {(correct || revealed) && (
        <div className="flex flex-col gap-3">
          <p className={correct ? 'text-mastered' : 'text-secondary-500'}>
            {correct
              ? tries === 1
                ? 'Correct, first try.'
                : `Correct — ${String(tries)} tries.`
              : 'The word is:'}{' '}
            <span className="font-display text-lg tracking-tight">{word.text}</span>
          </p>

          <div>
            <button
              className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
              onClick={onNext}
              type="button"
            >
              Now say it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakStep({
  onNext,
  onSelfJudge,
  onTranscript,
  result,
  scoring,
  selfJudged,
  speak,
  word,
}: {
  readonly onNext: () => void;
  readonly onSelfJudge: (verdict: boolean) => void;
  readonly onTranscript: (transcript: string) => void;
  readonly result: SpeechScore | null;
  readonly scoring: boolean;
  readonly selfJudged: boolean | null;
  readonly speak: (text: string, rate: number) => void;
  readonly word: FlowWord;
}): ReactElement {
  const mic = useMicrophone({
    lang: LANG,
    onTranscript,
    // Synthesis and recognition on one device fight over the audio path.
    beforeListen: () => { speak('', SENTENCE_RATE); },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-primary-900">
        Now say <span className="font-display text-lg tracking-tight">{word.text}</span>{' '}
        <span className="num text-muted">/{word.ipa}/</span>
      </p>

      {mic.supported ? (
        <MicButton mic={mic} scoring={scoring} />
      ) : (
        <SelfAssessment
          onJudge={onSelfJudge}
          speak={speak}
          verdict={selfJudged}
          word={word}
        />
      )}

      {mic.state === 'denied' && (
        <p className="text-tertiary-700">
          The microphone is blocked for this site. Allow it in the address bar, or judge yourself
          below — the course does the same on browsers with no speech recognition.
        </p>
      )}

      {mic.state === 'denied' && (
        <SelfAssessment onJudge={onSelfJudge} speak={speak} verdict={selfJudged} word={word} />
      )}

      {result !== null && <SpeechResult result={result} />}

      {(result !== null || selfJudged !== null) && (
        <div>
          <button
            className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
            onClick={onNext}
            type="button"
          >
            Now use it in a sentence
          </button>
        </div>
      )}
    </div>
  );
}

function SentenceStep({
  onNext,
  onTranscript,
  onTyped,
  result,
  scoring,
  typed,
  word,
}: {
  readonly onNext: () => void;
  readonly onTranscript: (transcript: string, mode: SpeechScore['mode']) => void;
  readonly onTyped: (value: string) => void;
  readonly result: SpeechScore | null;
  readonly scoring: boolean;
  readonly typed: string;
  readonly word: FlowWord;
}): ReactElement {
  const mic = useMicrophone({
    lang: LANG,
    onTranscript: (heard) => { onTranscript(heard, 'sentence'); },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-primary-900">
        Put <span className="font-display text-lg tracking-tight">{word.text}</span> into a
        sentence of your own, and say it.
      </p>

      {mic.supported && <MicButton mic={mic} scoring={scoring} />}

      {/*
        Typing is not a lesser microphone, it is a different thing being
        checked — so it posts a different mode and comes back with no
        pronunciation score at all rather than a zero.
      */}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onTranscript(typed, 'sentence-written');
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="label">{mic.supported ? 'Or type it' : 'Type your sentence'}</span>
          <input
            className="h-10 w-72 max-w-full rounded-control border border-hairline px-3 text-primary-900"
            onChange={(event) => { onTyped(event.target.value); }}
            placeholder={`… ${word.text} …`}
            type="text"
            value={typed}
          />
        </label>

        <button
          className="h-10 rounded-control border border-primary-900 px-4 text-primary-900 disabled:opacity-60"
          disabled={typed.trim() === '' || scoring}
          type="submit"
        >
          Check it
        </button>
      </form>

      {result !== null && <SpeechResult result={result} />}

      {result !== null && (
        <div>
          <button
            className="h-9 rounded-control bg-secondary-500 px-4 text-primary-900"
            onClick={onNext}
            type="button"
          >
            See the three marks
          </button>
        </div>
      )}
    </div>
  );
}

function MicButton({
  mic,
  scoring,
}: {
  readonly mic: ReturnType<typeof useMicrophone>;
  readonly scoring: boolean;
}): ReactElement {
  const listening = mic.state === 'listening';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        aria-pressed={listening}
        className={[
          'flex h-11 items-center gap-2 rounded-control px-4',
          listening
            ? 'bg-tertiary-500 text-surface'
            : 'border border-primary-900 text-primary-900',
        ].join(' ')}
        disabled={scoring}
        onClick={listening ? mic.stop : mic.listen}
        type="button"
      >
        {/*
          The same glyph in both states, on purpose. The icon set has no stop
          symbol, and inventing one here would put a second, slightly different
          icon vocabulary on the marketing page. What actually carries the state
          is the colour, the label and `aria-pressed` — all three change, which
          is what `13-frontend.md` asks for.
        */}
        <Glyph name="mic" size={16} />
        {listening ? 'Listening — press to stop' : 'Press and speak'}
      </button>

      {/*
        A live region, because the state change is the whole instruction: a
        visitor who cannot tell whether it is listening will not speak.
      */}
      <p aria-live="polite" className="text-[11px] text-muted">
        {scoring
          ? 'Marking…'
          : listening
            ? 'Go ahead.'
            : mic.transcript === ''
              ? 'Nothing heard yet.'
              : `Heard: “${mic.transcript}”`}
      </p>
    </div>
  );
}

/**
 * The path for a browser with no speech recognition — Firefox, and several on
 * mobile.
 *
 * It produces **no score**, and the scorecard says so rather than filling the
 * gap. The course takes the same position: a learner judging themselves is
 * evidence of a kind, and it is not the same evidence as a transcript.
 */
function SelfAssessment({
  onJudge,
  speak,
  verdict,
  word,
}: {
  readonly onJudge: (verdict: boolean) => void;
  readonly speak: (text: string, rate: number) => void;
  readonly verdict: boolean | null;
  readonly word: FlowWord;
}): ReactElement {
  return (
    <div className="rounded-control border border-hairline p-3">
      <p className="text-muted">
        This browser has no speech recognition. Listen once more, say it aloud, and judge yourself
        — which is what the course does here too.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="h-9 rounded-control border border-hairline px-3 text-primary-900"
          onClick={() => { speak(word.text, DICTATION_SLOW_RATE); }}
          type="button"
        >
          Play it slowly
        </button>

        <button
          className="h-9 rounded-control border border-mastered px-3 text-mastered"
          onClick={() => { onJudge(true); }}
          type="button"
        >
          That matched
        </button>

        <button
          className="h-9 rounded-control border border-tertiary-500 px-3 text-tertiary-700"
          onClick={() => { onJudge(false); }}
          type="button"
        >
          Not yet
        </button>
      </div>

      {verdict !== null && (
        <p className="mt-2 text-[11px] text-muted">
          Recorded as your own judgement, not a score.
        </p>
      )}
    </div>
  );
}

/**
 * What came back, including the part that is the actual product.
 *
 * A number is not the feedback. "You said /w/ where /v/ belongs; your lower lip
 * should touch your top teeth" is, and it is why the diagnoses are rendered
 * larger than the percentage.
 */
function SpeechResult({ result }: { readonly result: SpeechScore }): ReactElement {
  if (result.isNotHeard) {
    return (
      <p className="rounded-control border border-hairline p-3 text-muted">
        Nothing was heard — that is usually a microphone, and it says nothing about how you said
        it. Try once more.
      </p>
    );
  }

  return (
    <div className="rounded-control border border-hairline p-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {result.scorePercent !== null && (
          <p className="num text-2xl text-primary-900">{result.scorePercent}%</p>
        )}

        {result.heard !== '' && (
          <p className="text-muted">
            heard <span className="font-mono text-primary-900">{result.heard}</span>
          </p>
        )}
      </div>

      {result.sentence !== null && <SentenceFindings findings={result.sentence} />}

      {result.diagnoses.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {result.diagnoses.map((diagnosis) => (
            <li key={`${diagnosis.expected}-${diagnosis.heard}`}>
              <p className="text-tertiary-700">
                <span className="num">/{diagnosis.heard}/</span> where{' '}
                <span className="num">/{diagnosis.expected}/</span> belongs
              </p>
              <p className="text-muted">{diagnosis.articulationFix}</p>
            </li>
          ))}
        </ul>
      )}

      {result.diagnoses.length === 0 && result.isClean && (
        <p className="mt-2 text-mastered">No named error — that is the sound.</p>
      )}
    </div>
  );
}

function SentenceFindings({
  findings,
}: {
  readonly findings: NonNullable<SpeechScore['sentence']>;
}): ReactElement {
  return (
    <div className="mt-2 flex flex-col gap-1">
      <Finding met={findings.usesTheWord} text="Used the word, or one of its forms" />
      <Finding
        met={findings.isSentenceLength}
        text={`A sentence rather than a fragment — ${String(findings.wordCount)} words`}
      />

      {/*
        The limit, stated on the page and not only in a comment. A freely spoken
        sentence has no reviewed answer to mark against, and a confident-looking
        grammar percentage over that absence would be the least defensible thing
        here.
      */}
      <p className="mt-1 text-[11px] text-muted">
        Grammar is not marked here — there is no target to mark against. Inside the course, the
        sentence stage has a reviewed answer and every accepted alternative.
      </p>
    </div>
  );
}

function Finding({ met, text }: { readonly met: boolean; readonly text: string }): ReactElement {
  return (
    <p className={met ? 'text-mastered' : 'text-tertiary-700'}>
      <span aria-hidden className="mr-2">
        {met ? '✓' : '✗'}
      </span>
      {text}
    </p>
  );
}

/**
 * Three marks, kept apart.
 *
 * Averaging them into one number would be the single most misleading thing this
 * page could do: they measure different failures, and a learner who spells
 * perfectly and cannot say the word has a specific problem that a combined 70%
 * hides. The course's own mastery matrix keeps the same axes separate for the
 * same reason.
 */
function Scorecard({
  correct,
  onAgain,
  revealed,
  said,
  selfJudged,
  sentence,
  tries,
  word,
}: {
  readonly correct: boolean;
  readonly onAgain: () => void;
  readonly revealed: boolean;
  readonly said: SpeechScore | null;
  readonly selfJudged: boolean | null;
  readonly sentence: SpeechScore | null;
  readonly tries: number;
  readonly word: FlowWord;
}): ReactElement {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-primary-900">
        <span className="font-display text-2xl tracking-tight">{word.text}</span>{' '}
        <span className="num text-muted">/{word.ipa}/</span>{' '}
        <span className="font-bengali text-muted" lang="bn">
          {word.banglaMeaning}
        </span>
      </p>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Mark
          detail={
            correct
              ? tries === 1
                ? 'First try.'
                : `${String(tries)} tries.`
              : revealed
                ? 'Shown, not solved.'
                : 'Not solved.'
          }
          label="Spelling"
          value={correct ? '100%' : '0%'}
        />

        <Mark
          detail={
            said === null
              ? selfJudged === null
                ? 'Not attempted.'
                : selfJudged
                  ? 'Your own judgement — this browser has no recogniser.'
                  : 'Your own judgement — not yet.'
              : said.diagnoses.length === 0
                ? 'No named error.'
                : said.diagnoses[0]?.articulationFix ?? ''
          }
          label="Pronunciation"
          value={said?.scorePercent === undefined || said.scorePercent === null ? '—' : `${String(said.scorePercent)}%`}
        />

        <Mark
          detail={
            sentence?.sentence == null
              ? 'Not attempted.'
              : sentence.sentence.usesTheWord
                ? sentence.sentence.isSentenceLength
                  ? `Used it, in ${String(sentence.sentence.wordCount)} words.`
                  : 'Used it, but that is a fragment.'
                : 'The word was not in it.'
          }
          label="Sentence"
          value={
            sentence?.sentence == null
              ? '—'
              : sentence.sentence.usesTheWord && sentence.sentence.isSentenceLength
                ? '✓'
                : '✗'
          }
        />
      </dl>

      <p className="text-[11px] text-muted">
        Three marks, never averaged — they measure different failures, and one number would hide
        the one you have. Nothing here was recorded.
      </p>

      <div>
        <button
          className="h-10 rounded-control bg-secondary-500 px-5 font-medium text-primary-900"
          onClick={onAgain}
          type="button"
        >
          Another word
        </button>
      </div>
    </div>
  );
}

function Mark({
  detail,
  label,
  value,
}: {
  readonly detail: string;
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <div className="card p-4">
      <dt className="label">{label}</dt>
      <dd>
        <p className="num mt-1 text-2xl text-primary-900">{value}</p>
        <p className="mt-1 text-muted">{detail}</p>
      </dd>
    </div>
  );
}
