import { type ReactElement } from 'react';
import { MasteryMatrix, type IMasteryMatrixCell } from '@/components/data/mastery-matrix';
import { HeatCell } from '@/components/primitives/heat-cell';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatCell } from '@/components/primitives/stat-cell';
import {
  readActivity,
  readExamMilestones,
  readMasterySnapshot,
  readProgressSummary,
} from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { AccuracyChart } from './accuracy-chart';

/**
 * The record: accuracy over time with milestone markers, both mastery
 * matrices, and the activity heatmap.
 *
 * Four reads, issued together. The two matrices are **one component** with a
 * different `dimension` — `12-design-system.md` is explicit that two would
 * drift within a month, and this is the screen where they would have.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A quarter, which is longer than the programme and covers a lapsed return. */
const WINDOW_DAYS = 84;

function toMatrixCells(
  cells: readonly {
    readonly dimensionId: string;
    readonly label: string;
    readonly attempts: number;
    readonly correct: number;
    readonly accuracy: number;
    readonly isWeakness: boolean;
  }[],
): readonly IMasteryMatrixCell[] {
  return cells.map((cell) => ({
    ...cell,
    drillHref: `/practice?focus=${encodeURIComponent(cell.dimensionId)}`,
  }));
}

export default async function ProgressPage(): Promise<ReactElement> {
  const user = await requireUser();

  const [summary, mastery, activity, milestones] = await Promise.all([
    readProgressSummary(user.userId),
    readMasterySnapshot(user.userId),
    readActivity(user.userId, WINDOW_DAYS),
    readExamMilestones(user.userId),
  ]);

  const markers = milestones.flatMap((milestone) =>
    milestone.passedAt === null
      ? []
      : [{ date: milestone.passedAt.slice(0, 10), label: milestone.title }],
  );

  // Twelve columns of seven days, oldest column first, so a column is a week.
  const weeks: (typeof activity.days)[] = [];
  for (let start = 0; start < activity.days.length; start += 7) {
    weeks.push(activity.days.slice(start, start + 7));
  }

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Progress</h1>
        <span className="num text-muted">last {WINDOW_DAYS} days</span>
      </header>

      <section className="card col-span-12 grid grid-cols-2 gap-6 p-4 md:grid-cols-4">
        <StatCell
          label="Overall accuracy"
          note={summary.itemsReviewed === 0 ? 'nothing measured yet' : `${String(summary.itemsReviewed)} answers`}
          {...(summary.itemsReviewed === 0 ? {} : { unit: '%' })}
          value={summary.itemsReviewed === 0 ? '—' : Math.round(summary.overallAccuracy)}
        />
        <StatCell label="Mastered" note="dimensions holding up" value={summary.masteredItems} />
        <StatCell
          label="Longest streak"
          note={summary.streakIsAlive ? 'alive today' : 'not alive today'}
          unit="days"
          value={summary.longestStreak}
        />
        <StatCell
          label="Time on task"
          note={`${String(activity.totalAttempts)} answers`}
          unit="min"
          value={activity.totalMinutes}
        />
      </section>

      <section className="card col-span-12">
        <PanelHeader note="daily, gaps left open" title="Accuracy over time" />
        <div className="p-4">
          <AccuracyChart
            milestones={markers}
            points={activity.days.map((day) => ({
              date: day.date,
              accuracy: day.accuracy,
              attempts: day.attempts,
            }))}
          />
        </div>
      </section>

      <section className="card col-span-12">
        <PanelHeader note={`${String(WINDOW_DAYS)} days`} title="Activity" />
        <div className="flex gap-1 overflow-x-auto p-4">
          {weeks.map((week) => (
            <ul className="flex flex-col gap-1" key={week[0]?.date ?? ''}>
              {week.map((day) => (
                <li key={day.date}>
                  {/*
                    Tinted by that day's accuracy, with the date and the value
                    in the accessible name — a heatmap whose only signal is
                    colour is unreadable to the people it most disadvantages.
                  */}
                  <HeatCell
                    accuracy={day.accuracy}
                    label={`${day.date}, ${String(day.attempts)} answers`}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* Both matrices. One component, two dimensions. */}
      <section className="card col-span-12 xl:col-span-7">
        <PanelHeader note={`${String(mastery.phonemes.length)} sounds`} title="Sounds" />
        <div className="p-4">
          {mastery.phonemes.length === 0 ? (
            <p className="text-muted">Nothing scored yet. This fills in as you speak.</p>
          ) : (
            <MasteryMatrix
              cells={toMatrixCells(mastery.phonemes)}
              dimension="phoneme"
              drillLabel="Drill this sound"
            />
          )}
        </div>
      </section>

      <section className="card col-span-12 xl:col-span-5">
        <PanelHeader note={`${String(mastery.ruleFamilies.length)} rules`} title="Rules" />
        <div className="p-4">
          {mastery.ruleFamilies.length === 0 ? (
            <p className="text-muted">Nothing scored yet. This fills in as you spell.</p>
          ) : (
            <MasteryMatrix
              cells={toMatrixCells(mastery.ruleFamilies)}
              dimension="rule_family"
              drillLabel="Drill this rule"
            />
          )}
        </div>
      </section>
    </>
  );
}
