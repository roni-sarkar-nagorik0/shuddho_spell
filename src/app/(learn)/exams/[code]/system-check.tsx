'use client';

import { useCallback, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { StatusBadge } from '@/components/primitives/status-badge';

export type CheckState = 'untested' | 'passing' | 'failing';

export interface ISystemCheckResult {
  readonly microphone: CheckState;
  readonly audio: CheckState;
}

export interface ISystemCheckProps {
  readonly onChange: (result: ISystemCheckResult) => void;
  readonly result: ISystemCheckResult;
}

/**
 * The pre-flight: can this browser hear the learner, and can the learner hear
 * it?
 *
 * Both are **actually exercised**, not feature-detected. `getUserMedia` is
 * called and the track stopped immediately — a permission the learner has not
 * granted yet is precisely what this is for, and asking here means the browser
 * prompt happens in a lobby rather than forty seconds into a timed section.
 *
 * A failing check is not fatal and does not lie about that: the pronunciation
 * section falls back to self-assessment the same way the lesson does. What the
 * lobby refuses is *starting blind* — the learner has to have run the check and
 * seen the result before the clock can start.
 */
export function SystemCheck({ onChange, result }: ISystemCheckProps): ReactElement {
  const [busy, setBusy] = useState(false);

  const runMicrophone = useCallback(async (): Promise<CheckState> => {
    if (typeof navigator === 'undefined' || navigator.mediaDevices as unknown === undefined) {
      return 'failing';
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Release it at once. Holding an open microphone through a lobby is a
      // recording light the learner did not ask for.
      for (const track of stream.getTracks()) {
        track.stop();
      }

      return 'passing';
    } catch {
      return 'failing';
    }
  }, []);

  const runAudio = useCallback((): CheckState => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return 'failing';
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Audio check.');
    utterance.lang = 'en-GB';
    window.speechSynthesis.speak(utterance);

    return 'passing';
  }, []);

  const runBoth = useCallback(() => {
    setBusy(true);

    void runMicrophone()
      .then((microphone) => { onChange({ microphone, audio: runAudio() }); })
      .finally(() => { setBusy(false); });
  }, [runMicrophone, runAudio, onChange]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        <CheckRow
          label="Microphone"
          note="Used by the pronunciation section. Self-assessment stands in if it fails."
          state={result.microphone}
        />
        <CheckRow
          label="Audio"
          note="Used to play every dictated word."
          state={result.audio}
        />
      </ul>

      <div>
        <button
          className="flex h-9 items-center gap-1.5 rounded-control border border-primary-900 px-3 text-primary-900 disabled:border-cold disabled:text-cold"
          disabled={busy}
          onClick={runBoth}
          type="button"
        >
          <Glyph name="mic" size={14} />
          {busy ? 'Checking…' : 'Run the system check'}
        </button>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  note,
  state,
}: {
  readonly label: string;
  readonly note: string;
  readonly state: CheckState;
}): ReactElement {
  return (
    <li className="flex flex-wrap items-center gap-3">
      <span className="w-24 font-medium text-primary-900">{label}</span>
      <StatusBadge
        label={state === 'untested' ? 'Not checked' : state === 'passing' ? 'Working' : 'Unavailable'}
        tone={state === 'untested' ? 'neutral' : state === 'passing' ? 'passed' : 'failed'}
      />
      <span className="text-muted">{note}</span>
    </li>
  );
}
