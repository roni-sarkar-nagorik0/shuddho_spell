import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatCell } from '@/components/primitives/stat-cell';
import { readWeakSpots } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { WeakSpotTable } from './weak-spot-table';

/**
 * Everything the learner has got wrong, and when each piece comes back.
 *
 * The schedule axis is drawn from `review_items.due_at` — the timestamp the
 * scheduler wrote — and from nothing else. Re-deriving it from the interval
 * index would agree today and diverge the first time the policy changed, and
 * the version on screen would be the wrong one.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function WeakSpotsPage(): Promise<ReactElement> {
  const user = await requireUser();
  const weakSpots = await readWeakSpots(user.userId);

  const busiest = Math.max(1, ...weakSpots.schedule.map((column) => column.count));
  const overdue = weakSpots.schedule.find((column) => column.key === 'overdue')?.count ?? 0;

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Weak spots</h1>
        <span className="num text-muted">{weakSpots.totalTracked} tracked</span>
      </header>

      <section className="card col-span-12 grid grid-cols-3 gap-6 p-4">
        <StatCell label="Tracked" note="items you have got wrong" value={weakSpots.totalTracked} />
        <StatCell
          label="Mastered"
          note="off the schedule for now"
          value={weakSpots.masteredCount}
        />
        <StatCell label="Overdue" note="waiting longer than they should" value={overdue} />
      </section>

      {/* The schedule axis: review_items.due_at, bucketed. */}
      <section className="card col-span-12">
        <PanelHeader
          action={
            <Link className="text-[11px] text-primary-900" href="/practice">
              Practise the overdue
            </Link>
          }
          note="from review_items.due_at"
          title="When these come back"
        />
        <ul className="flex items-end gap-4 p-4">
          {weakSpots.schedule.map((column) => (
            <li className="flex flex-1 flex-col items-center gap-2" key={column.key}>
              <MonoValue size="sm" value={column.count} />
              {/*
                The bar is proportional to the busiest bucket, and the number
                sits above it — the height alone is never the only reading.
              */}
              <span
                aria-hidden="true"
                className="w-full rounded-t bg-primary-100"
                style={{ height: `${String(Math.round((column.count / busiest) * 72) + 2)}px` }}
              />
              <span className="label text-center">{column.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="col-span-12">
        <WeakSpotTable rows={weakSpots.items} />
      </section>
    </>
  );
}
