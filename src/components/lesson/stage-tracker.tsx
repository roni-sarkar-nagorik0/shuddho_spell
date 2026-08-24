import { type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import { cn } from '@/lib/cn';

/**
 * The five stages, in the order the server enforces.
 *
 * Restated here rather than imported from `lessons/domain` because `components`
 * may not reach into a module's domain. The list is short, it is fixed by 003's
 * check constraint, and the server is what actually refuses an illegal move —
 * this array only decides what the tracker draws.
 */
export const TRACKER_STAGES = Object.freeze([
  'review',
  'learn',
  'dictate',
  'speak',
  'build',
] as const);

export type TrackerStage = (typeof TRACKER_STAGES)[number];

const LABELS: Readonly<Record<TrackerStage, string>> = {
  review: 'Review',
  learn: 'Learn',
  dictate: 'Dictate',
  speak: 'Speak',
  build: 'Build',
};

export interface IStageTrackerProps {
  readonly current: TrackerStage;
  readonly className?: string;
}

/**
 * Where the learner is, and what is behind and ahead of them.
 *
 * **Not navigation.** There is no link and no button on any step, because the
 * order is a domain rule the server holds: `LessonSession.advanceStage` refuses
 * a jump, so a tracker that offered one would offer a control that fails. A
 * done step shows a tick, the current one is filled, the rest are `cold` — and
 * each state is named in text for a screen reader, never carried by fill alone.
 */
export function StageTracker({ current, className }: IStageTrackerProps): ReactElement {
  const position = TRACKER_STAGES.indexOf(current);

  return (
    <ol aria-label="Lesson stages" className={cn('flex items-center gap-1', className)}>
      {TRACKER_STAGES.map((stage, index) => {
        const done = index < position;
        const active = index === position;

        return (
          <li className="flex items-center gap-1" key={stage}>
            {index > 0 && <span aria-hidden="true" className="h-px w-2 bg-hairline sm:w-4" />}

            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-control px-2',
                active && 'bg-primary-900 text-surface',
                done && 'bg-primary-100 text-primary-900',
                !active && !done && 'text-cold',
              )}
            >
              {done ? (
                <Glyph name="check" size={12} />
              ) : (
                <span className="num text-[11px]">{index + 1}</span>
              )}
              {LABELS[stage]}
              <span className="sr-only">
                {done ? ' — done' : active ? ' — current stage' : ' — not started'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
