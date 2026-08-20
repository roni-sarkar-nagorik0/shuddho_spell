'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { SentenceChips, type IChip } from '@/components/lesson/sentence-chips';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import { attemptResultSchema, type AttemptResult } from './lesson-contracts';

export interface IBuildSentence {
  readonly id: string;
  readonly banglaText: string;
  readonly englishText: string;
  readonly distractorWords: readonly string[];
}

export interface IBuildStageProps {
  readonly sessionId: string;
  readonly sentences: readonly IBuildSentence[];
  readonly onDone: () => void;
  readonly onSessionCounts: (itemsTotal: number, itemsCorrect: number) => void;
}

/**
 * A deterministic shuffle.
 *
 * `Math.random()` would give a different arrangement on the server and the
 * client and hydrate to a mismatch, and it would also make the exercise
 * un-reproducible when a learner reports that a sentence is wrong. Seeding from
 * the sentence id means the same sentence always starts the same way.
 */
function shuffle(words: readonly string[], seed: string): readonly string[] {
  const keyed = words.map((word, index) => {
    let hash = 0;

    for (const character of `${seed}:${word}:${String(index)}`) {
      hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 2_147_483_647;
    }

    return { word, hash };
  });

  return keyed.sort((a, b) => a.hash - b.hash).map((entry) => entry.word);
}

function toChips(sentence: IBuildSentence): readonly IChip[] {
  const words = [...sentence.englishText.split(/\s+/u).filter((word) => word !== ''), ...sentence.distractorWords];

  return shuffle(words, sentence.id).map((text, index) => ({
    id: `${sentence.id}-${String(index)}-${text}`,
    text,
  }));
}

/**
 * Stage five: build the sentence.
 *
 * The Bangla is the prompt and the chips are the English words plus the
 * distractors the content team wrote. The learner orders them; the **server**
 * decides whether the order is right, as it does for every other attempt in the
 * product.
 *
 * The distractors are the interesting half. A construction drill where every
 * chip belongs in the answer is a jigsaw with no wrong pieces, and the mistakes
 * a Bengali speaker actually makes — a stray article, a preposition that does
 * not belong — are exactly what the extra chips are for.
 */
export function BuildStage({
  sessionId,
  sentences,
  onDone,
  onSessionCounts,
}: IBuildStageProps): ReactElement {
  const [index, setIndex] = useState(0);
  const [chips, setChips] = useState<readonly IChip[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const startedAt = useRef<number>(0);

  const current = sentences[index] ?? null;

  useEffect(() => {
    startedAt.current = Date.now();
    setChips(current === null ? [] : toChips(current));
  }, [current]);

  const submit = useCallback(() => {
    if (current === null || saving || chips.length === 0) {
      return;
    }

    setSaving(true);
    setFailed(false);

    void apiFetch(`/api/v1/lessons/sessions/${sessionId}/attempts`, {
      method: 'POST',
      schema: attemptResultSchema,
      body: {
        mode: 'construction',
        sentenceItemId: current.id,
        submittedValue: chips.map((chip) => chip.text).join(' '),
        latencyMs: Math.max(0, Date.now() - startedAt.current),
      },
    })
      .then((answer) => {
        setResult(answer);
        onSessionCounts(answer.itemsTotal, answer.itemsCorrect);
      })
      .catch(() => { setFailed(true); })
      .finally(() => { setSaving(false); });
  }, [current, saving, chips, sessionId, onSessionCounts]);

  const next = (): void => {
    setResult(null);

    if (index + 1 >= sentences.length) {
      onDone();
      return;
    }

    setIndex((value) => value + 1);
  };

  if (current === null) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-muted">This day has no sentences to build.</p>
        <button
          className="h-8 rounded-control bg-primary-900 px-3 text-surface"
          onClick={onDone}
          type="button"
        >
          Finish the day
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="num text-[11px] text-muted">
        {index + 1} of {sentences.length}
      </p>

      <div>
        <p className="label">Say this in English</p>
        <p className="mt-1 font-bengali text-lg" lang="bn">
          {current.banglaText}
        </p>
      </div>

      <SentenceChips
        chips={chips}
        disabled={result !== null || saving}
        label="Sentence words — drag to reorder, or lift with Space and move with the arrow keys"
        onChange={setChips}
      />

      <p className="rounded-card border border-hairline bg-surface px-3 py-2">
        {chips.map((chip) => chip.text).join(' ')}
      </p>

      {result === null ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="h-9 rounded-control bg-primary-900 px-4 text-surface disabled:bg-cold"
            disabled={saving || chips.length === 0}
            onClick={submit}
            type="button"
          >
            {saving ? 'Checking…' : 'Check the sentence'}
          </button>
          <p className="text-muted">
            Not every chip belongs in the answer. Leave the wrong ones at the end.
          </p>
          {failed && <p className="text-tertiary-500">That did not save. Try again.</p>}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              label={result.isCorrect ? 'Correct' : 'Not quite'}
              tone={result.isCorrect ? 'passed' : 'failed'}
            />
            {!result.isCorrect && result.correctValue !== null && (
              <span>
                It is <span className="font-medium">{result.correctValue}</span>.
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
            {index + 1 >= sentences.length ? 'Finish the day' : 'Next sentence'}
          </button>
        </div>
      )}
    </div>
  );
}
