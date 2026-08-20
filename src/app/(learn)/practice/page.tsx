import Link from 'next/link';
import { type ReactElement } from 'react';
import { HeatCell } from '@/components/primitives/heat-cell';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatusBadge } from '@/components/primitives/status-badge';
import { readPracticeQueue } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { PracticeDrill } from './practice-drill';

/**
 * Standalone drills, chosen by weakness.
 *
 * **Nothing on this screen is random**, and the screen says so in its own
 * words rather than asking to be believed:
 *
 * - the weakness list ranks by **expected loss** — attempts × the distance to
 *   mastery — so a sound at 55% over ninety attempts outranks one at 20% over
 *   three, which is noise
 * - every drill item is in the spaced-repetition queue because it was answered
 *   **wrong**, and each carries the reason it sits where it does
 *
 * `?focus=` arrives from a mastery matrix's drill action and names the
 * dimension the learner asked for. It is looked up against their own
 * weaknesses, so a stale or invented id simply resolves to nothing rather than
 * changing what they are shown.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function PracticePage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  const user = await requireUser();
  const params = await searchParams;
  const raw = params['focus'];
  const focusId = typeof raw === 'string' ? raw : undefined;

  const queue = await readPracticeQueue(user.userId, focusId);

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Practice</h1>
        <span className="num text-muted">{queue.items.length} chosen for you</span>
      </header>

      {queue.focus !== null && (
        <section className="card card-accent col-span-12 p-4">
          <p className="label">You asked to drill</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-lg text-primary-900">{queue.focus.label}</span>
            <MonoValue size="sm" unit="%" value={Math.round(queue.focus.accuracy * 100)} />
            <span className="num text-[11px] text-muted">
              {queue.focus.correct}/{queue.focus.attempts} correct
            </span>
          </p>
        </section>
      )}

      <section className="card col-span-12 lg:col-span-8">
        <PanelHeader
          note={`${String(queue.totalDue)} due in total`}
          title="This session"
        />
        <div className="p-4">
          <PracticeDrill items={queue.items} totalDue={queue.totalDue} />
        </div>
      </section>

      <aside className="col-span-12 lg:col-span-4">
        <section className="card">
          <PanelHeader note="Weakest first" title="Why these" />
          <div className="p-3">
            <p className="text-muted">
              Ranked by how much each one is costing you — attempts multiplied by the gap to
              mastery, not by accuracy alone. Something you got wrong twice is not a weakness yet.
            </p>
          </div>

          {queue.weaknesses.length === 0 ? (
            <p className="border-t border-hairline p-3 text-muted">
              No weaknesses recorded. Everything you have attempted is holding up.
            </p>
          ) : (
            <ul className="flex flex-col border-t border-hairline">
              {queue.weaknesses.slice(0, 12).map((weakness) => (
                <li
                  className="flex items-center gap-2 border-b border-hairline px-3 py-2 last:border-b-0"
                  key={weakness.dimensionId}
                >
                  <HeatCell accuracy={weakness.accuracy} label={weakness.label} size="sm" />
                  <Link
                    className="min-w-0 flex-1 truncate font-mono text-primary-900"
                    href={`/practice?focus=${encodeURIComponent(weakness.dimensionId)}`}
                  >
                    {weakness.label}
                  </Link>
                  <StatusBadge
                    label={weakness.dimension === 'phoneme' ? 'sound' : 'rule'}
                    tone="neutral"
                  />
                  <MonoValue size="sm" unit="%" value={Math.round(weakness.accuracy * 100)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </>
  );
}
