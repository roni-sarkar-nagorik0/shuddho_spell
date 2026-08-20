'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement } from 'react';
import { DataTable, type IColumn } from '@/components/data/data-table';
import { StatusBadge } from '@/components/primitives/status-badge';

export interface IReviewRow {
  readonly reviewItemId: string;
  readonly prompt: string;
  readonly itemType: string;
  readonly daysOverdue: number;
  readonly lastErrorTags: readonly string[];
}

const COLUMNS: readonly IColumn<IReviewRow>[] = [
  { id: 'prompt', header: 'Item', pinned: true, width: '14rem', render: (row) => row.prompt },
  { id: 'type', header: 'Type', width: '8rem', render: (row) => row.itemType },
  {
    id: 'overdue',
    header: 'Overdue',
    numeric: true,
    width: '7rem',
    render: (row) => (row.daysOverdue <= 0 ? 'today' : `${String(row.daysOverdue)}d`),
  },
  {
    id: 'tags',
    header: 'Last error',
    render: (row) =>
      row.lastErrorTags.length === 0 ? (
        <span className="text-muted">—</span>
      ) : (
        <span className="flex gap-1">
          {row.lastErrorTags.map((tag) => (
            <StatusBadge key={tag} label={tag} tone="failed" />
          ))}
        </span>
      ),
  },
];

/**
 * The due-review table.
 *
 * A Client Component because `DataTable` takes `render` and `rowKey` functions,
 * which cannot cross the server boundary — the rows themselves are plain data
 * and do cross. Everything shown here was resolved by the Server Component
 * above it; this file adds no fetch of its own.
 *
 * Pagination is disabled, not hidden: the queue is capped by
 * `06-spaced-repetition.md` at a size a learner can finish, so there is never a
 * second page of it. `/weak-spots` is where the whole backlog lives.
 */
export function ReviewTable({ rows }: { readonly rows: readonly IReviewRow[] }): ReactElement {
  const router = useRouter();

  return (
    <DataTable
      caption="Due for review"
      columns={COLUMNS}
      emptyMessage="Nothing is due. Come back after today's lesson."
      onActivate={() => { router.push('/practice'); }}
      onCursorChange={() => undefined}
      page={{ nextCursor: null }}
      rowKey={(row) => row.reviewItemId}
      rows={rows}
    />
  );
}
