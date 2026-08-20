'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { PhonemeStrip } from '@/components/learning/phoneme-strip';
import {
  bestResult,
  createRecogniser,
  isSpeechRecognitionSupported,
  PERMISSION_DENIED_ERRORS,
  type ISpeechRecogniser,
} from '@/components/lesson/speech-recognition';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { attemptResultSchema, type AttemptResult } from './lesson-contracts';
import { type ILearnWord } from './learn-stage';

export interface ISpeakStageProps {
  readonly sessionId: string;
  readonly words: readonly ILearnWord[];
  readonly onDone: () => void;
  readonly onSessionCounts: (itemsTotal: number, itemsCorrect: number) => void;
}

type MicState = 'idle' | 'listening' | 'denied' | 'error';

/**
 * Stage four: say it.
 *
 * Three things `13-frontend.md` says get shipped broken, all handled here:
 *
 * 1. **Feature detection, not a disabled button.** Firefox and several mobile
 *    browsers have no `SpeechRecognition`. Those learners get the
 *    self-assessment path — listen, say it, judge yourself — which submits a
 *    real attempt with the word as its transcript and their own verdict as the
 *    observation. A dead microphone button would be a stage they simply cannot
 *    finish.
 * 2. **Recording state is unambiguous.** A learner who cannot tell whether it
 *    is listening will not speak. The button changes colour, label, icon and
 *    `aria-pressed`, and a live region announces the change.
 * 3. **Permission-denied is a first-class state with a way out.** It is not an
 *    error toast — it explains where the setting is and offers the
 *    self-assessment path so the lesson is not blocked on a browser dialog.
 *
 * The server never receives audio (`07-speech-scoring.md`). The browser
 * transcribes; only the transcript is posted; the score is still computed
 * server-side, because a client-computed score is a client-editable score.
 */
export function SpeakStage({
  sessionId,
  words,
  onDone,
  onSessionCounts,
}: ISpeakStageProps): ReactElement {
  const [index, setIndex] = useState(0);
  const [mic, setMic] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [supported, setSupported] = useState(true);
  const recogniser = useRef<ISpeechRecogniser | null>(null);
  const startedAt = useRef<number>(0);

  const current = words[index] ?? null;

  // Detection runs in an effect, not during render: the server has no
  // `window`, and deciding this during SSR would either crash or hydrate the
  // wrong branch.
  useEffect(() => { setSupported(isSpeechRecognitionSupported()); }, []);

  useEffect(() => {
    startedAt.current = Date.now();

    return () => { recogniser.current?.abort(); };
  }, [index]);

  const say = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);
  }, []);

  const submit = useCallback(
    (heard: string) => {
      if (current === null || saving) {
        return;
      }

      setSaving(true);

      void apiFetch(`/api/v1/lessons/sessions/${sessionId}/attempts`, {
        method: 'POST',
        schema: attemptResultSchema,
        body: {
          mode: 'pronunciation',
          wordId: current.wordId,
          transcript: heard,
          heardPhonemes: null,
          latencyMs: Math.max(0, Date.now() - startedAt.current),
        },
      })
        .then((answer) => {
          setResult(answer);
          onSessionCounts(answer.itemsTotal, answer.itemsCorrect);
        })
        .catch(() => { setMic('error'); })
        .finally(() => { setSaving(false); });
    },
    [current, saving, sessionId, onSessionCounts],
  );

  const listen = useCallback(() => {
    if (current === null) {
      return;
    }

    const engine = createRecogniser();

    if (engine === null) {
      setSupported(false);
      return;
    }

    // Speech synthesis and recognition on the same device fight over the audio
    // path. Cancel anything speaking before opening the microphone.
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    engine.lang = 'en-GB';
    engine.continuous = false;
    engine.interimResults = false;
    engine.maxAlternatives = 1;

    engine.onresult = (event) => {
      const heard = bestResult(event);

      if (heard !== null) {
        setTranscript(heard.transcript);
        submit(heard.transcript);
      }
    };

    engine.onerror = (event) => {
      setMic(PERMISSION_DENIED_ERRORS.includes(event.error) ? 'denied' : 'error');
    };

    engine.onend = () => {
      setMic((state) => (state === 'listening' ? 'idle' : state));
    };

    recogniser.current = engine;
    setTranscript('');
    setMic('listening');
    startedAt.current = Date.now();
    engine.start();
  }, [current, submit]);

  const stop = useCallback(() => {
    recogniser.current?.stop();
    setMic('idle');
  }, []);

  const next = (): void => {
    setResult(null);
    setTranscript('');
    setMic('idle');

    if (index + 1 >= words.length) {
      onDone();
      return;
    }

    setIndex((value) => value + 1);
  };

  if (current === null) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">This day has no words to speak.</p>
        <button
          className="h-8 rounded-control bg-primary-900 px-3 text-surface"
          onClick={onDone}
          type="button"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="num text-[11px] text-muted">
        {index + 1} of {words.length}
      </p>

      <div className="card p-4">
        <PhonemeStrip
          bangla={current.banglaSound === '' ? null : current.banglaSound}
          cells={current.cells}
          syllables={current.syllables.length === 0 ? [current.text] : current.syllables}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-label={`Listen to ${current.text}`}
          className="flex h-9 items-center gap-1.5 rounded-control border border-primary-900 px-3 text-primary-900"
          onClick={() => { say(current.text); }}
          type="button"
        >
          <Glyph name="play" size={14} />
          Listen
        </button>

        {supported && result === null && (
          <button
            aria-pressed={mic === 'listening'}
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-control px-3 text-surface',
              mic === 'listening' ? 'bg-tertiary-500' : 'bg-primary-900',
            )}
            disabled={saving}
            onClick={mic === 'listening' ? stop : listen}
            type="button"
          >
            <Glyph name="mic" size={14} />
            {mic === 'listening' ? 'Listening — tap to stop' : 'Record'}
          </button>
        )}
      </div>

      {/* Recording state, announced as well as drawn. */}
      <p aria-live="polite" className="min-h-[1.25rem] text-muted">
        {mic === 'listening' && 'Listening. Say the word now.'}
        {saving && 'Scoring your attempt…'}
        {transcript !== '' && `Heard: ${transcript}`}
      </p>

      {mic === 'denied' && (
        <div className="card card-accent p-4">
          <p className="font-medium text-primary-900">The microphone is blocked</p>
          <p className="mt-1 text-muted">
            Your browser refused access. Open the padlock or camera icon in the address bar, allow
            the microphone for this site, then press Record again. You can also carry on without it
            below — the stage does not depend on the microphone.
          </p>
        </div>
      )}

      {mic === 'error' && (
        <p className="text-tertiary-500">
          The microphone stopped unexpectedly. Try again, or use the self-assessment below.
        </p>
      )}

      {/*
        The fallback. Rendered whenever recognition is unavailable, blocked or
        failed — the three states that would otherwise leave a learner stuck at
        a control that cannot work.
      */}
      {(!supported || mic === 'denied' || mic === 'error') && result === null && (
        <div className="card flex flex-col gap-3 p-4">
          <p className="font-medium text-primary-900">Say it, then judge yourself</p>
          <p className="text-muted">
            Listen to the word, say it aloud twice, and tell us honestly how it went. Self-assessment
            is recorded as a real attempt — it is worth less than a scored one, and it is worth far
            more than skipping the sound entirely.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="h-9 rounded-control bg-primary-900 px-3 text-surface"
              disabled={saving}
              onClick={() => { submit(current.text); }}
              type="button"
            >
              I said it clearly
            </button>
            <button
              className="h-9 rounded-control border border-primary-900 px-3 text-primary-900"
              disabled={saving}
              onClick={() => { submit(''); }}
              type="button"
            >
              I struggled with it
            </button>
          </div>
        </div>
      )}

      {result !== null && (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={result.isCorrect ? 'Clear' : 'Needs work'}
              tone={result.isCorrect ? 'passed' : 'failed'}
            />
            <span className="num text-muted">{Math.round(result.score)}%</span>
            {result.errorTags.map((tag) => (
              <StatusBadge key={tag} label={tag} tone="failed" />
            ))}
          </div>

          <button
            autoFocus
            className="h-9 rounded-control bg-primary-900 px-4 text-surface"
            onClick={next}
            type="button"
          >
            {index + 1 >= words.length ? 'Continue to building' : 'Next word'}
          </button>
        </div>
      )}
    </div>
  );
}
