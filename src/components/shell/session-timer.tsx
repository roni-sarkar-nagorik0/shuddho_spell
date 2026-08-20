'use client';

import { useEffect, useState, type ReactElement } from 'react';

const STARTED_AT_KEY = 'shuddhospell.session-started-at';

function readStartedAt(): number {
  const stored = window.sessionStorage.getItem(STARTED_AT_KEY);
  const parsed = stored === null ? Number.NaN : Number.parseInt(stored, 10);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const now = Date.now();
  window.sessionStorage.setItem(STARTED_AT_KEY, String(now));
  return now;
}

export function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Time on task this visit, not a countdown.
 *
 * The start is kept in `sessionStorage` so navigating between screens does not
 * reset it and closing the tab does. It renders `--:--` until the first effect
 * runs: the server has no clock for a browser session, so rendering a number
 * during SSR would guarantee a hydration mismatch on every page load.
 *
 * The exam countdown is a different component with a different source of truth
 * — the server's remaining seconds (F12.4). Nothing here is ever authoritative.
 */
export function SessionTimer({ label }: { readonly label: string }): ReactElement {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = readStartedAt();
    const tick = (): void => { setSeconds((Date.now() - startedAt) / 1000); };

    tick();
    const handle = window.setInterval(tick, 1000);

    return () => { window.clearInterval(handle); };
  }, []);

  return (
    <span className="flex items-center gap-1.5">
      <span className="label">{label}</span>
      <span className="num text-neutral-700">
        {seconds === null ? '--:--' : formatElapsed(seconds)}
      </span>
    </span>
  );
}
