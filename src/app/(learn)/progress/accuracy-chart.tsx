import { type ReactElement } from 'react';

export interface IAccuracyPoint {
  readonly date: string;
  /** 0..1, or `null` on a day with nothing attempted — a gap, not a zero. */
  readonly accuracy: number | null;
  readonly attempts: number;
}

export interface IMilestoneMarker {
  readonly date: string;
  readonly label: string;
}

export interface IAccuracyChartProps {
  readonly points: readonly IAccuracyPoint[];
  readonly milestones: readonly IMilestoneMarker[];
}

const WIDTH = 720;
const HEIGHT = 160;

/**
 * Accuracy over time, with a rule where each milestone was passed.
 *
 * A Server Component — no state, no effect, no handler, so it stays on the
 * server and ships no JavaScript.
 *
 * **Days with no attempts are gaps, not zeroes.** Joining across them would
 * draw a line through days the learner did not study and read as a collapse in
 * accuracy; the polyline is split into segments instead, which is the honest
 * picture of an interrupted week.
 *
 * The milestone rules are dated from when the exam was actually passed, not
 * from where it sits in the programme — a chart against dates needs a date.
 */
export function AccuracyChart({ points, milestones }: IAccuracyChartProps): ReactElement {
  const step = points.length <= 1 ? 0 : WIDTH / (points.length - 1);
  const x = (index: number): number => index * step;
  const y = (accuracy: number): number => HEIGHT - accuracy * HEIGHT;

  // Split at every gap so the line is drawn only where there is data.
  const segments: string[][] = [];
  let run: string[] = [];

  for (const [index, point] of points.entries()) {
    if (point.accuracy === null) {
      if (run.length > 1) {
        segments.push(run);
      }
      run = [];
      continue;
    }

    run.push(`${String(x(index))},${String(y(point.accuracy))}`);
  }

  if (run.length > 1) {
    segments.push(run);
  }

  const dateIndex = new Map(points.map((point, index) => [point.date, index] as const));
  const measured = points.filter((point) => point.accuracy !== null).length;

  if (measured === 0) {
    return (
      <p className="text-muted">
        Nothing measured yet. The line starts on your first answered item.
      </p>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <svg
        aria-label={`Daily accuracy over ${String(points.length)} days, measured on ${String(measured)} of them`}
        className="w-full text-primary-900"
        height={HEIGHT}
        preserveAspectRatio="none"
        role="img"
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        width="100%"
      >
        {/* 50% and 80% guides — the pass mark and the mastery threshold. */}
        {[0.5, 0.8].map((level) => (
          <line
            key={level}
            stroke="#E4E6E0"
            strokeWidth={1}
            x1={0}
            x2={WIDTH}
            y1={y(level)}
            y2={y(level)}
          />
        ))}

        {milestones.map((milestone) => {
          const index = dateIndex.get(milestone.date);

          return index === undefined ? null : (
            <line
              key={`${milestone.date}-${milestone.label}`}
              stroke="#E9A13B"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              x1={x(index)}
              x2={x(index)}
              y1={0}
              y2={HEIGHT}
            />
          );
        })}

        {segments.map((segment) => (
          <polyline
            fill="none"
            key={segment[0]}
            points={segment.join(' ')}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="num">
          {points[0]?.date} → {points[points.length - 1]?.date}
        </span>
        <span>Guides at 50% and 80%.</span>
        {milestones.length > 0 && (
          <span>
            Dashed rules: {milestones.map((milestone) => milestone.label).join(', ')} passed.
          </span>
        )}
      </figcaption>
    </figure>
  );
}
