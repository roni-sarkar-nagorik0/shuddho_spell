import { type ReactElement } from 'react';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatCell } from '@/components/primitives/stat-cell';
import { readExamMilestones, readProgramOverview, readProgressSummary } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { ProgramTable } from './program-table';

/**
 * The whole programme on one screen: 28 rows grouped by week, the five exam
 * milestones interleaved at the day they unlock, and a stats rail beside it.
 *
 * Three reads, issued together, through the composition root. `isUnlocked`
 * comes from the use case rather than being recomputed here — the API and the
 * page decide it in one place, and a client that ignored it would still be
 * refused by `GetProgramDay`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ProgramPage(): Promise<ReactElement> {
  const user = await requireUser();

  const [overview, milestones, summary] = await Promise.all([
    readProgramOverview(user.userId),
    readExamMilestones(user.userId),
    readProgressSummary(user.userId),
  ]);

  const remaining = overview.totalDays - overview.completedDays;

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Programme</h1>
        <span className="num text-muted">
          {overview.track === 'sprint21' ? 'Sprint · 21 days' : 'Standard · 28 days'}
        </span>
      </header>

      <section className="col-span-12 lg:col-span-9">
        <ProgramTable
          currentDayIndex={overview.currentDayIndex}
          days={overview.days}
          milestones={milestones}
        />
      </section>

      {/* The stats rail. */}
      <aside className="col-span-12 flex flex-col gap-4 lg:col-span-3">
        <section className="card">
          <PanelHeader title="Position" />
          <div className="flex flex-col gap-4 p-4">
            <StatCell label="Current day" value={overview.currentDayIndex} />
            <StatCell
              label="Completed"
              note={`${String(remaining)} left`}
              value={overview.completedDays}
            />
            <StatCell
              label="Longest streak"
              note={summary.streakIsAlive ? 'Alive today' : 'Not alive today'}
              unit="days"
              value={summary.longestStreak}
            />
          </div>
        </section>

        <section className="card">
          <PanelHeader title="Milestones" />
          <ul className="flex flex-col">
            {milestones.map((milestone) => (
              <li
                className="flex items-baseline gap-2 border-b border-hairline px-3 py-2 last:border-b-0"
                key={milestone.code}
              >
                <span className="num w-6 shrink-0 text-muted">{milestone.unlockDayIndex}</span>
                <span className="min-w-0 flex-1 truncate">{milestone.title}</span>
                <span className="num shrink-0 text-[11px] text-muted">
                  {milestone.hasPassed ? 'passed' : milestone.isUnlocked ? 'open' : 'locked'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </>
  );
}
