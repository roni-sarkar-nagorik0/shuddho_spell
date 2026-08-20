'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { LetterTiles } from '@/components/lesson/letter-tiles';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import { attemptResultSchema, type AttemptResult } from './lesson-contracts';
import { type ILearnWord } from './learn-stage';

export interface IDictateStageProps {
  readonly sessionId: string;
  readonly words: readonly ILearnWord[];
  readonly onDone: () => void;
  readonly onSessionCounts: (itemsTotal: number, itemsCorrect: number) => void;
}

type Mark = 'correct' | 'wrong' | 'missing';

/**
 * Per-letter marks, computed **from the server's answer**, never instead of it.
 *
 * `correctValue` arrives only once the server has judged the attempt, so this
 * runs after the verdict and only ever explains it. The component never decides
 * whether the learner was right.
 */
function markLetters(submitted: string, correct: string): readonly Mark[] {
  const expected = correct.toLowerCase();

  // `Array.from` rather than a spread or `.split('')`: it iterates code points,
  // so a word carrying a non-ASCII character maps one tile to one character
  // instead of splitting it across two.
  return Array.from(expected).map((letter, index) => {
    const typed = submitted[index]?.toLowerCase() ?? '';

    if (typed === '') {
      return 'missing';
    }

    return typed === letter ? 'correct' : 'wrong';
  });
}

/**
 * Stage three: spell what you hear.
 *
 * The word is never shown — only played, with its Bangla meaning as the anchor.
 * Showing the spelling would make the exercise a copying task, and the tiles
 * already give away the letter count, which is as much help as the drill can
 * afford.
 *
 * Latency is measured from the moment the prompt appears to the moment the
 * learner submits, and posted with the attempt: `06-spaced-repetition.md` uses
 * it, and a client that did not send it would leave the scheduler guessing.
 */
export function DictateStage({
  sessionId,
  words,
  onDone,
  onSessionCounts,
}: IDictateStageProps): ReactElement {
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitted, setSubmitted] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedAt = useRef<number>(0);

  const current = words[index] ?? null;

  const say = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);
  }, []);

  // A new prompt: reset the clock and play it once, unasked. A dictation drill
  // that waits to be told to speak makes the learner press a button before
  // every single word.
  useEffect(() => {
    startedAt.current = Date.now();

    if (current !== null) {
      say(current.text);
    }
  }, [current, say]);

  const submit = useCallback(
    (value: string) => {
      const trimmed = value.trim();

      if (current === null || saving || trimmed === '') {
        return;
      }

      setSaving(true);
      setFailed(false);
      setSubmitted(trimmed);

      void apiFetch(`/api/v1/lessons/sessions/${sessionId}/attempts`, {
        method: 'POST',
        schema: attemptResultSchema,
        body: {
          mode: 'dictation',
          wordId: current.wordId,
          submittedValue: trimmed,
          latencyMs: Math.max(0, Date.now() - startedAt.current),
        },
      })
        .then((answer) => {
          setResult(answer);
          onSessionCounts(answer.itemsTotal, answer.itemsCorrect);
        })
        .catch(() => { setFailed(true); })
        .finally(() => { setSaving(false); });
    },
    [current, saving, sessionId, onSessionCounts],
  );

  const next = (): void => {
    setResult(null);
    setSubmitted('');

    if (index + 1 >= words.length) {
      onDone();
      return;
    }

    setIndex((value) => value + 1);
  };

  if (current === null) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">This day has no words to dictate.</p>
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

  const marks =
    result === null || result.correctValue === null
      ? null
      : markLetters(submitted, result.correctValue);

  return (
    <div className="flex flex-col gap-5">
      <p className="num text-[11px] text-muted">
        {index + 1} of {words.length}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          aria-label="Play the word again"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-900 text-primary-900"
          onClick={() => { say(current.text); }}
          type="button"
        >
          <Glyph name="play" size={16} />
        </button>

        <div>
          <p className="label">Meaning</p>
          <p className="font-bengali text-base" lang="bn">
            {current.banglaMeaning}
          </p>
        </div>
      </div>

      <LetterTiles
        disabled={result !== null || saving}
        label={`Spell the word you heard, ${String(current.text.length)} letters`}
        length={current.text.length}
        marks={marks}
        onSubmit={submit}
        resetKey={current.wordId}
      />

      {result === null ? (
        <p className="text-muted">
          Type the letters. Backspace goes back and clears in one press, arrows move between tiles,
          Enter submits. {failed && <span className="text-tertiary-500">That did not save — try Enter again.</span>}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={result.isCorrect ? 'Correct' : 'Not quite'}
              tone={result.isCorrect ? 'passed' : 'failed'}
            />
            {!result.isCorrect && result.correctValue !== null && (
              <span>
                It is <span className="font-mono font-medium">{result.correctValue}</span>.
              </span>
            )}
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
            {index + 1 >= words.length ? 'Continue to speaking' : 'Next word'}
          </button>
        </div>
      )}
    </div>
  );
}
