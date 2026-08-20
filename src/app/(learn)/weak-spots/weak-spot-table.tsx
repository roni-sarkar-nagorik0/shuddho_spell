'use client';

import { useState, type ReactElement } from 'react';
import { DataTable, type IColumn } from '@/components/data/data-table';
import { Drawer } from '@/components/overlays/drawer';
import { HeatCell } from '@/components/primitives/heat-cell';
import { MonoValue } from '@/components/primitives/mono-value';
import { StatusBadge } from '@/components/primitives/status-badge';

export interface IWeakSpotRow {
  readonly reviewItemId: string;
  readonly itemType: string;
  readonly prompt: string;
  readonly dueAt: string;
  readonly daysUntilDue: number;
  readonly intervalIndex: number;
  readonly timesSeen: number;
  readonly timesCorrect: number;
  readonly accuracy: number | null;
  readonly consecutiveCorrect: number;
  readonly isMastered: boolean;
  readonly lastErrorTags: readonly string[];
}

/** `-3` reads as "3 days overdue", `0` as "today". Never a bare signed number. */
function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `${String(Math.abs(daysUntilDue))}d overdue`;
  }

  return daysUntilDue === 0 ? 'today' : `in ${String(daysUntilDue)}d`;
}

const COLUMNS: readonly IColumn<IWeakSpotRow>[] = [
  { id: 'prompt', header: 'Item', pinned: true, width: '16rem', render: (row) => row.prompt },
  { id: 'type', header: 'Type', width: '7rem', render: (row) => row.itemType },
  {
    id: 'accuracy',
    header: 'Accuracy',
    numeric: true,
    width: '8rem',
    render: (row) => (
      <span className="flex items-center justify-end gap-1.5">
        <HeatCell accuracy={row.accuracy} label={row.prompt} size="sm" />
        {row.accuracy === null ? '—' : `${String(Math.round(row.accuracy * 100))}%`}
      </span>
    ),
  },
  {
    id: 'seen',
    header: 'Seen',
    numeric: true,
    width: '6rem',
    render: (row) => `${String(row.timesCorrect)}/${String(row.timesSeen)}`,
  },
  { id: 'interval', header: 'Step', numeric: true, width: '5rem', render: (row) => row.intervalIndex },
  {
    id: 'due',
    header: 'Next review',
    numeric: true,
    width: '9rem',
    render: (row) => dueLabel(row.daysUntilDue),
  },
  {
    id: 'state',
    header: 'State',
    width: '8rem',
    render: (row) =>
      row.isMastered ? (
        <StatusBadge label="Mastered" tone="passed" />
      ) : (
        <StatusBadge label="Tracking" tone="neutral" />
      ),
  },
];

/**
 * Master-detail: the table is the master, the drawer is the detail.
 *
 * Enter on any row opens the drawer, which is why the whole thing works without
 * a mouse — `DataTable`'s grid keyboard model does the navigating and
 * `onActivate` does the opening. The drawer traps focus and returns it to the
 * cell that opened it.
 */
export function WeakSpotTable({ rows }: { readonly rows: readonly IWeakSpotRow[] }): ReactElement {
  const [selected, setSelected] = useState<IWeakSpotRow | null>(null);

  return (
    <>
      <DataTable
        caption="Everything you have got wrong · arrows move, Enter opens the detail"
        columns={COLUMNS}
        emptyMessage="Nothing tracked yet. Items arrive here when you answer them wrong."
        onActivate={setSelected}
        onCursorChange={() => undefined}
        page={{ nextCursor: null }}
        rowKey={(row) => row.reviewItemId}
        rows={rows}
      />

      <Drawer
        onClose={() => { setSelected(null); }}
        open={selected !== null}
        title={selected?.prompt ?? ''}
      >
        {selected !== null && (
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="label">Next review</dt>
              <dd className="num">
                {new Date(selected.dueAt).toLocaleString()} · {dueLabel(selected.daysUntilDue)}
              </dd>
            </div>
            <div>
              <dt className="label">Interval step</dt>
              <dd>
                <MonoValue value={selected.intervalIndex} />
                <span className="ml-2 text-muted">
                  The ladder is 1, 3, 7, 16 and 35 days. A wrong answer drops it back.
                </span>
              </dd>
            </div>
            <div>
              <dt className="label">Record</dt>
              <dd className="num">
                {selected.timesCorrect} correct of {selected.timesSeen} · {selected.consecutiveCorrect}{' '}
                in a row
              </dd>
            </div>
            <div>
              <dt className="label">Last errors</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {selected.lastErrorTags.length === 0 ? (
                  <span className="text-muted">None recorded.</span>
                ) : (
                  selected.lastErrorTags.map((tag) => (
                    <StatusBadge key={tag} label={tag} tone="failed" />
                  ))
                )}
              </dd>
            </div>
          </dl>
        )}
      </Drawer>
    </>
  );
}
