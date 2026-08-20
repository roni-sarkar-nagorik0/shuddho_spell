'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export interface IExamCountdownProps {
  /** The server's number, from the last response that carried one. */
  readonly serverRemainingSeconds: number;
  /**
   * Changing this restarts the local interpolation from the server's number.
   * The runtime bumps it on every response that reports remaining seconds.
   */
  readonly syncToken: number;
  /** Fired once, when the local clock reaches zero. */
  readonly onExpired: () => void;
}

/** `secondary-500` from here down. Five minutes: time to stop lingering. */
const WARNING_SECONDS = 300;

/** `tertiary-500` from here down. One minute: time to answer what is in front of you. */
const CRITICAL_SECONDS = 60;

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);

  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * The exam clock.
 *
 * **The server's number is the only number.** This interpolates between syncs
 * so the display ticks smoothly, and it re-anchors to the server's figure every
 * time one arrives — every answer save, every section submission. A tab that
 * was suspended for ten minutes catches up on the next sync rather than
 * carrying ten minutes of credit, and nothing the browser believes about the
 * time is ever sent back: rule 2 rejects a late write against
 * `serverDeadlineAt`, not against this.
 *
 * `Date.now()` deltas rather than counting ticks: `setInterval` does not fire
 * in a background tab, so a counter that decremented per tick would run slow by
 * exactly the time the learner spent in another tab — in their favour, which is
 * the worst direction for it to be wrong.
 *
 * Two thresholds, each announced **once** through a polite live region.
 * `13-frontend.md` and `12-design-system.md` both ask for these; announcing on
 * every tick instead would make a screen reader unusable for the last five
 * minutes of a paper.
 */
export function ExamCountdown({
  serverRemainingSeconds,
  syncToken,
  onExpired,
}: IExamCountdownProps): ReactElement {
  const [remaining, setRemaining] = useState(serverRemainingSeconds);
  const anchor = useRef({ at: 0, seconds: serverRemainingSeconds });
  const announced = useRef({ warning: false, critical: false });
  const expiredFired = useRef(false);

  useEffect(() => {
    anchor.current = { at: Date.now(), seconds: serverRemainingSeconds };
    setRemaining(serverRemainingSeconds);
  }, [serverRemainingSeconds, syncToken]);

  useEffect(() => {
    const tick = (): void => {
      const elapsed = (Date.now() - anchor.current.at) / 1000;
      const left = Math.max(0, anchor.current.seconds - elapsed);

      setRemaining(left);

      if (left <= 0 && !expiredFired.current) {
        expiredFired.current = true;
        onExpired();
      }
    };

    tick();
    const handle = window.setInterval(tick, 1000);

    return () => { window.clearInterval(handle); };
  }, [onExpired]);

  const announcement = useMemo(() => {
    if (remaining <= CRITICAL_SECONDS && !announced.current.critical) {
      announced.current.critical = true;
      announced.current.warning = true;
      return 'One minute remaining.';
    }

    if (remaining <= WARNING_SECONDS && !announced.current.warning) {
      announced.current.warning = true;
      return 'Five minutes remaining.';
    }

    return '';
  }, [remaining]);

  const tone =
    remaining <= CRITICAL_SECONDS
      ? 'text-tertiary-500'
      : remaining <= WARNING_SECONDS
        ? 'text-secondary-500'
        : 'text-surface';

  return (
    <span className="flex items-center gap-2">
      <span className="label text-primary-100">Remaining</span>

      {/*
        The colour is a second signal, never the only one — the digits
        themselves are the reading, and a learner who cannot distinguish amber
        from white still sees 04:59.
      */}
      <span aria-label={`${formatCountdown(remaining)} remaining`} className={cn('num text-lg', tone)}>
        {formatCountdown(remaining)}
      </span>

      <span aria-live="polite" className="sr-only" role="status">
        {announcement}
      </span>
    </span>
  );
}
