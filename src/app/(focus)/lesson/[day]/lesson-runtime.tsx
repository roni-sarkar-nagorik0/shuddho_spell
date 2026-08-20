'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { StageTracker, type TrackerStage } from '@/components/lesson/stage-tracker';
import { MonoValue } from '@/components/primitives/mono-value';
import { apiFetch } from '@/lib/api/client';
import { lessonSessionSchema, type LessonSessionView } from './lesson-contracts';
import { DictateStage } from './dictate-stage';
import { LearnStage, type ILearnWord } from './learn-stage';
import { SpeakStage } from './speak-stage';
import { ReviewStage } from './review-stage';

export interface ILessonRule {
  readonly id: string;
  readonly code: string;
  readonly statement: string;
  readonly examples: readonly string[];
  readonly counterexamples: readonly string[];
}

export interface ILessonRuntimeProps {
  readonly dayIndex: number;
  readonly title: string;
  readonly description: string;
  readonly words: readonly ILearnWord[];
  readonly rules: readonly ILessonRule[];
}

const NEXT_STAGE: Readonly<Record<TrackerStage, TrackerStage | null>> = {
  review: 'learn',
  learn: 'dictate',
  dictate: 'speak',
  speak: 'build',
  build: null,
};

/**
 * The lesson runtime: open or resume the session, draw the tracker, run the
 * stage the **server** says the learner is on.
 *
 * `POST /api/v1/lessons/sessions` is idempotent — it picks up an unfinished
 * session rather than inserting a second one — so mounting this is safe on a
 * refresh, on a prefetch, and on React's development double-mount.
 *
 * **The stage comes from the server on every transition.** Advancing does not
 * set local state and then tell the server; it asks the server to advance and
 * takes the stage from the response. `LessonSession.advanceStage` refuses a
 * skip, and this is what makes that refusal visible: a learner who tampered
 * with the request gets an error and stays where they were, not a UI that has
 * moved on while the database has not.
 *
 * Stages beyond `review` render their heading and a Continue control here.
 * F11.4 through F11.7 replace each panel with its real screen — the session,
 * the tracker and the server-enforced ordering are already the real thing, so
 * those features add the stage's content and nothing else.
 */
export function LessonRuntime({
  dayIndex,
  title,
  description,
  words,
  rules,
}: ILessonRuntimeProps): ReactElement {
  const [session, setSession] = useState<LessonSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    void apiFetch('/api/v1/lessons/sessions', {
      method: 'POST',
      schema: lessonSessionSchema,
      body: { dayIndex },
    })
      .then(setSession)
      .catch(() => { setError('This day could not be opened. It may not be unlocked yet.'); });
  }, [dayIndex]);

  /**
   * The per-session counters, refreshed from each attempt's response.
   *
   * The header shows correct-of-total, and every attempt endpoint already
   * returns both after writing them — so the number in the header is the
   * database's, not a tally the browser kept alongside it.
   */
  const updateCounts = useCallback((itemsTotal: number, itemsCorrect: number) => {
    setSession((current) => (current === null ? current : { ...current, itemsTotal, itemsCorrect }));
  }, []);

  const advance = useCallback(() => {
    if (session === null || advancing) {
      return;
    }

    const toStage = NEXT_STAGE[session.stage];

    if (toStage === null) {
      return;
    }

    setAdvancing(true);
    setError(null);

    void apiFetch(`/api/v1/lessons/sessions/${session.sessionId}/stage`, {
      method: 'PATCH',
      schema: lessonSessionSchema,
      body: { toStage },
    })
      .then(setSession)
      // The server refused the move. Say so and stay put — the alternative is a
      // tracker showing a stage the database does not agree the learner is on.
      .catch(() => { setError('That stage could not be started. The order is fixed.'); })
      .finally(() => { setAdvancing(false); });
  }, [session, advancing]);

  if (error !== null && session === null) {
    return (
      <div className="mx-auto max-w-content px-6 py-16">
        <p className="text-tertiary-500">{error}</p>
        <Link className="mt-4 inline-block text-primary-900 underline" href="/program">
          Back to the programme
        </Link>
      </div>
    );
  }

  if (session === null) {
    return <p className="mx-auto max-w-content px-6 py-16 text-muted">Opening day {dayIndex}…</p>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-topbar shrink-0 items-center gap-4 border-b border-hairline bg-surface px-4">
        <Link
          aria-label="Leave the lesson"
          className="flex h-8 items-center gap-1.5 rounded-control px-2 text-muted hover:bg-primary-50"
          href="/program"
        >
          <Glyph name="close" size={16} />
          <span className="text-label uppercase">Exit</span>
        </Link>

        <span className="num text-muted">Day {session.dayIndex}</span>
        <span className="min-w-0 truncate font-medium text-primary-900">{title}</span>

        <span className="ml-auto flex items-center gap-4">
          <span className="flex items-baseline gap-1.5">
            <span className="label">Correct</span>
            <MonoValue size="sm" value={`${String(session.itemsCorrect)}/${String(session.itemsTotal)}`} />
          </span>
          <StageTracker current={session.stage} />
        </span>
      </header>

      <main className="paper flex-1">
        <div className="mx-auto max-w-content px-6 py-8">
          <h1 className="font-display text-lg tracking-tight text-primary-900">
            {STAGE_HEADINGS[session.stage]}
          </h1>
          <p className="mt-1 text-muted">{session.stage === 'review' ? REVIEW_NOTE : description}</p>

          {error !== null && <p className="mt-3 text-tertiary-500">{error}</p>}

          <div className="mt-6">
            {session.stage === 'review' ? (
              <ReviewStage onDone={advance} />
            ) : session.stage === 'learn' ? (
              <LearnStage onDone={advance} rules={rules} words={words} />
            ) : session.stage === 'dictate' ? (
              <DictateStage
                onDone={advance}
                onSessionCounts={updateCounts}
                sessionId={session.sessionId}
                words={words}
              />
            ) : session.stage === 'speak' ? (
              <SpeakStage
                onDone={advance}
                onSessionCounts={updateCounts}
                sessionId={session.sessionId}
                words={words}
              />
            ) : (
              <button
                className="h-9 rounded-control bg-primary-900 px-4 text-surface disabled:bg-cold"
                disabled={advancing || NEXT_STAGE[session.stage] === null}
                onClick={advance}
                type="button"
              >
                {NEXT_STAGE[session.stage] === null ? 'Finish the day' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const REVIEW_NOTE = 'Yesterday first. Nothing new until this is clear.';

const STAGE_HEADINGS: Readonly<Record<TrackerStage, string>> = {
  review: 'Review',
  learn: 'Learn the words',
  dictate: 'Spell what you hear',
  speak: 'Say it',
  build: 'Build the sentence',
};
