'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { MonoValue } from '@/components/primitives/mono-value';
import { StatusBadge } from '@/components/primitives/status-badge';
import { cn } from '@/lib/cn';

export interface IProgramDayRow {
  readonly dayIndex: number;
  readonly weekIndex: number;
  readonly title: string;
  readonly estimatedMinutes: number;
  readonly isComplete: boolean;
  readonly isUnlocked: boolean;
}

export interface IProgramMilestoneRow {
  readonly code: string;
  readonly title: string;
  readonly unlockDayIndex: number;
  readonly isUnlocked: boolean;
  readonly hasPassed: boolean;
}

export interface IProgramTableProps {
  readonly days: readonly IProgramDayRow[];
  readonly milestones: readonly IProgramMilestoneRow[];
  readonly currentDayIndex: number;
}

interface IWeek {
  readonly weekIndex: number;
  readonly days: readonly IProgramDayRow[];
}

function groupByWeek(days: readonly IProgramDayRow[]): readonly IWeek[] {
  const weeks = new Map<number, IProgramDayRow[]>();

  for (const day of days) {
    const bucket = weeks.get(day.weekIndex) ?? [];
    bucket.push(day);
    weeks.set(day.weekIndex, bucket);
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekIndex, bucket]) => ({ weekIndex, days: bucket }));
}

/**
 * The 28 days, grouped by week, with the exam milestones interleaved at the day
 * they unlock.
 *
 * A hand-built table rather than `DataTable`: this one has three kinds of row —
 * week headers, day rows and milestone rows — plus a row that expands. That is
 * a different structure, not a configuration of the same one, and bending the
 * grid table into it would leave both worse.
 *
 * Expanding is a real `<button>` with `aria-expanded` and `aria-controls`, so
 * the whole table is operable from the keyboard without any of the roving-focus
 * machinery: the rows are few enough that plain Tab order is the right answer.
 */
export function ProgramTable({
  days,
  milestones,
  currentDayIndex,
}: IProgramTableProps): ReactElement {
  const [expanded, setExpanded] = useState<number | null>(currentDayIndex);
  const weeks = groupByWeek(days);

  const milestonesBefore = (dayIndex: number): readonly IProgramMilestoneRow[] =>
    milestones.filter((milestone) => milestone.unlockDayIndex === dayIndex);

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="label h-8 w-16 border-b border-hairline px-3">Day</th>
            <th className="label h-8 border-b border-hairline px-3">Focus</th>
            <th className="label h-8 w-24 border-b border-hairline px-3 text-right">Minutes</th>
            <th className="label h-8 w-28 border-b border-hairline px-3">State</th>
            <th className="label h-8 w-24 border-b border-hairline px-3" />
          </tr>
        </thead>

        {weeks.map((week) => (
          <tbody key={week.weekIndex}>
            <tr>
              <th
                className="label bg-neutral-50 px-3 py-1.5 text-left"
                colSpan={5}
                scope="colgroup"
              >
                Week {week.weekIndex}
              </th>
            </tr>

            {week.days.map((day) => (
              <ProgramRows
                day={day}
                expanded={expanded === day.dayIndex}
                isCurrent={day.dayIndex === currentDayIndex}
                key={day.dayIndex}
                milestones={milestonesBefore(day.dayIndex)}
                onToggle={() => {
                  setExpanded((current) => (current === day.dayIndex ? null : day.dayIndex));
                }}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

interface IProgramRowsProps {
  readonly day: IProgramDayRow;
  readonly milestones: readonly IProgramMilestoneRow[];
  readonly expanded: boolean;
  readonly isCurrent: boolean;
  readonly onToggle: () => void;
}

function ProgramRows({
  day,
  milestones,
  expanded,
  isCurrent,
  onToggle,
}: IProgramRowsProps): ReactElement {
  const panelId = `day-${String(day.dayIndex)}-detail`;

  return (
    <>
      {/* The milestone sits above the day it opens on, because it gates that day. */}
      {milestones.map((milestone) => (
        <tr className="border-b border-hairline bg-primary-50" key={milestone.code}>
          <td className="num h-8 px-3 text-muted">{milestone.unlockDayIndex}</td>
          <td className="h-8 px-3 font-medium text-primary-900" colSpan={2}>
            {milestone.title}
          </td>
          <td className="h-8 px-3">
            <StatusBadge
              label={milestone.hasPassed ? 'Passed' : milestone.isUnlocked ? 'Open' : 'Locked'}
              tone={milestone.hasPassed ? 'passed' : milestone.isUnlocked ? 'due' : 'locked'}
            />
          </td>
          <td className="h-8 px-3">
            {milestone.isUnlocked && (
              <Link className="text-primary-900 underline" href={`/exams/${milestone.code}`}>
                Lobby
              </Link>
            )}
          </td>
        </tr>
      ))}

      <tr className={cn('h-8 border-b border-hairline', isCurrent && 'bg-secondary-100/40')}>
        <td className="num h-8 px-3">{day.dayIndex}</td>
        <td className="h-8 px-3">
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 text-left text-primary-900"
            onClick={onToggle}
            type="button"
          >
            <Glyph name={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
            {day.title}
          </button>
        </td>
        <td className="h-8 px-3 text-right">
          <MonoValue size="sm" value={day.estimatedMinutes} />
        </td>
        <td className="h-8 px-3">
          <StatusBadge
            label={day.isComplete ? 'Done' : day.isUnlocked ? 'Open' : 'Locked'}
            tone={day.isComplete ? 'passed' : day.isUnlocked ? (isCurrent ? 'active' : 'due') : 'locked'}
          />
        </td>
        <td className="h-8 px-3">
          {day.isUnlocked && (
            <Link className="text-primary-900 underline" href={`/lesson/${String(day.dayIndex)}`}>
              {day.isComplete ? 'Revisit' : 'Open'}
            </Link>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-hairline">
          <td className="px-3 py-3" colSpan={5} id={panelId}>
            <p className="text-muted">
              {day.isUnlocked
                ? 'Five stages: review, learn, dictate, speak, build. The server holds the order — you cannot skip ahead.'
                : 'Locked until you reach it. The programme is sequential by design; the spacing is what makes the review schedule work.'}
            </p>
            <p className="num mt-2 text-[11px] text-muted">
              Week {day.weekIndex} · day {day.dayIndex} · about {day.estimatedMinutes} minutes
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
