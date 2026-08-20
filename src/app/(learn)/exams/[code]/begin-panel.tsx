'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactElement } from 'react';
import { apiFetch } from '@/lib/api/client';
import { examAttemptSchema } from './exam-contracts';
import { SystemCheck, type ISystemCheckResult } from './system-check';

export interface IBeginPanelProps {
  readonly code: string;
  /** The server's lock. `false` and the button is never enabled, whatever is ticked. */
  readonly serverAllowsStart: boolean;
  readonly durationMinutes: number;
  readonly questionCount: number;
}

const UNCHECKED: ISystemCheckResult = { microphone: 'untested', audio: 'untested' };

/**
 * The begin button, gated on **three** things: the learner's acknowledgement,
 * a system check that has actually been run, and the server's own verdict.
 *
 * The first two are courtesies — they stop a learner starting a timed paper
 * with a broken microphone or without reading the rules. The third is the real
 * gate, and it is not enforced here at all: `StartExamAttempt` re-evaluates
 * eligibility and refuses. This component cannot grant anything, only withhold.
 *
 * "Run" is the test, not "pass". A learner on Firefox will fail the microphone
 * check honestly and must still be able to sit the exam — the pronunciation
 * section falls back to self-assessment. Requiring a pass would lock them out
 * of a paper over a browser choice.
 */
export function BeginPanel({
  code,
  serverAllowsStart,
  durationMinutes,
  questionCount,
}: IBeginPanelProps): ReactElement {
  const [acknowledged, setAcknowledged] = useState(false);
  const [check, setCheck] = useState<ISystemCheckResult>(UNCHECKED);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkRun = check.microphone !== 'untested' && check.audio !== 'untested';
  const canBegin = serverAllowsStart && acknowledged && checkRun && !starting;

  const begin = (): void => {
    if (!canBegin) {
      return;
    }

    setStarting(true);
    setError(null);

    void apiFetch(`/api/v1/exams/${code}/attempts`, {
      method: 'POST',
      schema: examAttemptSchema,
    })
      .then((attempt) => { router.push(`/exams/attempt/${attempt.attemptId}`); })
      .catch(() => {
        setError('The exam could not be started. It may be locked, cooling down, or out of attempts.');
        setStarting(false);
      });
  };

  return (
    <div className="flex flex-col gap-5">
      <SystemCheck onChange={setCheck} result={check} />

      <label className="flex items-start gap-2">
        <input
          checked={acknowledged}
          className="mt-0.5"
          onChange={(event) => { setAcknowledged(event.target.checked); }}
          type="checkbox"
        />
        <span>
          I understand the clock starts now, runs for {durationMinutes} minutes whatever happens to
          my connection, and cannot be paused or extended. All {questionCount} questions are marked
          on the server.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-control bg-primary-900 px-5 text-surface disabled:bg-cold"
          disabled={!canBegin}
          onClick={begin}
          type="button"
        >
          {starting ? 'Starting…' : 'Begin the exam'}
        </button>

        {/*
          Say which gate is closed. A disabled button with no explanation is the
          most common way a learner concludes a product is broken.
        */}
        {!serverAllowsStart && <span className="text-muted">This exam is not open to you yet.</span>}
        {serverAllowsStart && !checkRun && (
          <span className="text-muted">Run the system check first.</span>
        )}
        {serverAllowsStart && checkRun && !acknowledged && (
          <span className="text-muted">Tick the box to confirm you have read the rules.</span>
        )}
      </div>

      {error !== null && <p className="text-tertiary-500">{error}</p>}
    </div>
  );
}
