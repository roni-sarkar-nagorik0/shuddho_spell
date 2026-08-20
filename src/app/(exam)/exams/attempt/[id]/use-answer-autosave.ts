'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface IAutosaveOptions {
  /**
   * Performs the write. Called with the settled value for one question — never
   * more than once per settle, and never retried by this hook.
   */
  readonly save: (questionId: string, value: string) => void;
}

export interface IAutosave {
  readonly queue: (questionId: string, value: string) => void;
  /** Writes everything outstanding immediately. Safe to call repeatedly. */
  readonly flush: () => void;
  readonly pendingCount: number;
}

/**
 * Long enough that a word typed letter by letter is one write, short enough
 * that a learner moving on with the mouse has already been saved.
 */
const SETTLE_MS = 600;

/**
 * Debounced answer autosave, with the flushes that make "a refresh loses
 * nothing" true.
 *
 * Saving on every keystroke would send twenty writes for one eight-letter
 * answer, against an endpoint that must not be retried and a rate limit sized
 * for a learner rather than a keyboard. Debouncing alone, though, moves the
 * risk instead of removing it: whatever was typed in the last six hundred
 * milliseconds would be lost to a refresh.
 *
 * So everything outstanding is flushed on four events: leaving the question,
 * submitting the section, the tab being hidden, and `pagehide`. The last two
 * are the ones that matter for a closed lid or a killed tab, and they are
 * **best-effort by nature** — a browser terminating a process will not wait for
 * a fetch. What makes the guarantee hold anyway is the server: every earlier
 * answer is already persisted, so the worst case is the single value being
 * typed at the moment the tab died.
 */
export function useAnswerAutosave({ save }: IAutosaveOptions): IAutosave {
  const pending = useRef(new Map<string, string>());
  const timer = useRef<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }

    if (pending.current.size === 0) {
      return;
    }

    // Copy and clear before writing, so a save that synchronously queues
    // another change does not lose it.
    const outstanding = [...pending.current.entries()];
    pending.current.clear();
    setPendingCount(0);

    for (const [questionId, value] of outstanding) {
      save(questionId, value);
    }
  }, [save]);

  const queue = useCallback(
    (questionId: string, value: string) => {
      pending.current.set(questionId, value);
      setPendingCount(pending.current.size);

      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }

      timer.current = window.setTimeout(flush, SETTLE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  return { queue, flush, pendingCount };
}
