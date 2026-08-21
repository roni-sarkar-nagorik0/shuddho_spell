import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';

export interface IPractiseTallyView {
  readonly distinctWords: number;
  readonly tries: number;
  readonly settled: number;
}

export interface IPractisedWordsProps {
  readonly course: IPractiseTallyView;
  readonly demo: IPractiseTallyView;
  /** The learner-local day these tallies cover, resolved on the server. */
  readonly date: string;
}

/**
 * Today's counts, and a way to the rest.
 *
 * It listed every word at first, and that was wrong for a panel: the demo alone
 * produces dozens of rows in an afternoon, and a summary that scrolls is not a
 * summary. The list moved to `/words`, which pages and filters and has room for
 * a history; what stays here is the pair of numbers a learner opens the
 * dashboard to see.
 *
 * A Server Component again as a result — there is nothing left to interact
 * with, so there is no reason to ship it to the browser.
 *
 * **Two tallies, never added together.** A lesson attempt is scored, scheduled
 * for review and rolled into mastery; a demo attempt is somebody pressing *Next
 * word* at the front door. One combined figure would let the second flatter the
 * first, and a learner checking their own progress is exactly the person that
 * number must not lie to.
 */
export function PractisedWords({ course, demo, date }: IPractisedWordsProps): ReactElement {
  const nothing = course.distinctWords === 0 && demo.distinctWords === 0;

  if (nothing) {
    return (
      <p className="text-muted">
        No words yet today. A lesson or the drill on the front page both count here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tally heading="In the course" tally={course} />
      <Tally heading="On the demo" tally={demo} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Counted for {date}, in your own timezone. A word tried more than once is still one word.
        </p>

        <Link
          className="flex h-9 items-center rounded-control border border-hairline bg-surface px-3 text-primary-900 hover:bg-primary-50"
          href="/words"
        >
          All my words
        </Link>
      </div>
    </div>
  );
}

interface ITallyProps {
  readonly heading: string;
  readonly tally: IPractiseTallyView;
}

function Tally({ heading, tally }: ITallyProps): ReactElement {
  return (
    <div className="flex flex-wrap items-baseline gap-4">
      <h3 className="min-w-32 font-medium text-primary-900">{heading}</h3>

      {/*
        Words and tries side by side, because they answer different questions —
        "how many did I work on" and "how much work was it" — and a single
        number answers neither.
      */}
      <span className="flex items-baseline gap-1.5">
        <span className="label">Words</span>
        <MonoValue size="sm" value={String(tally.distinctWords)} />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="label">Tries</span>
        <MonoValue size="sm" value={String(tally.tries)} />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="label">Right</span>
        <MonoValue size="sm" value={String(tally.settled)} />
      </span>
    </div>
  );
}
