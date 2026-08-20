'use client';

import { useState, type ReactElement } from 'react';
import { DataTable, type IColumn } from '@/components/data/data-table';

interface IDemoWord {
  readonly id: string;
  readonly headword: string;
  readonly ipa: string;
  readonly bangla: string;
  readonly day: number;
  readonly attempts: number;
  readonly accuracy: number;
}

/**
 * Real headwords, real IPA, real Bangla — the first rows of `week-01.words.txt`.
 *
 * The attempt counts are invented and the words are not, which is the right way
 * round: a fabricated transcription in a gallery is the sort of thing that gets
 * copied into content by someone in a hurry, and a fabricated attempt count is
 * obviously a demo number.
 */
const PAGE_ONE: readonly IDemoWord[] = [
  { id: '1', headword: 'the', ipa: 'ðə', bangla: 'দ্য', day: 1, attempts: 22, accuracy: 0.95 },
  { id: '2', headword: 'be', ipa: 'biː', bangla: 'বি', day: 1, attempts: 19, accuracy: 0.89 },
  { id: '3', headword: 'to', ipa: 'tuː', bangla: 'টু', day: 1, attempts: 17, accuracy: 0.76 },
  { id: '4', headword: 'of', ipa: 'ɒv', bangla: 'অভ্', day: 1, attempts: 14, accuracy: 0.43 },
  { id: '5', headword: 'and', ipa: 'ænd', bangla: 'অ্যান্ড', day: 2, attempts: 12, accuracy: 0.83 },
];

const PAGE_TWO: readonly IDemoWord[] = [
  { id: '6', headword: 'a', ipa: 'ə', bangla: 'আ', day: 2, attempts: 11, accuracy: 0.64 },
  { id: '7', headword: 'in', ipa: 'ɪn', bangla: 'ইন', day: 2, attempts: 9, accuracy: 0.91 },
  { id: '8', headword: 'that', ipa: 'ðæt', bangla: 'দ্যাট', day: 3, attempts: 8, accuracy: 0.38 },
];

const COLUMNS: readonly IColumn<IDemoWord>[] = [
  { id: 'headword', header: 'Word', pinned: true, width: '9rem', render: (row) => row.headword },
  {
    id: 'ipa',
    header: 'IPA',
    width: '8rem',
    render: (row) => <span className="num text-muted">/{row.ipa}/</span>,
  },
  {
    id: 'bangla',
    header: 'Bangla',
    width: '10rem',
    render: (row) => (
      <span className="font-bengali" lang="bn">
        {row.bangla}
      </span>
    ),
  },
  { id: 'day', header: 'Day', numeric: true, width: '5rem', render: (row) => row.day },
  {
    id: 'attempts',
    header: 'Attempts',
    numeric: true,
    width: '7rem',
    render: (row) => row.attempts,
  },
  {
    id: 'accuracy',
    header: 'Accuracy',
    numeric: true,
    width: '7rem',
    render: (row) => `${String(Math.round(row.accuracy * 100))}%`,
  },
];

/**
 * `DataTable` takes `render` and `rowKey` functions, which cannot cross the
 * server/client boundary — so every page that uses it wraps it in a Client
 * Component of its own, exactly like this one. The rows are what crosses; the
 * column definitions live on the client side of the line.
 */
export function TableDemo({ state }: { readonly state: 'loaded' | 'empty' | 'loading' }): ReactElement {
  const [cursor, setCursor] = useState<string | null>(null);
  const rows = cursor === null ? PAGE_ONE : PAGE_TWO;

  if (state === 'empty') {
    return (
      <DataTable
        caption="Words"
        columns={COLUMNS}
        emptyMessage="No words match these filters."
        onCursorChange={() => undefined}
        page={{ nextCursor: null }}
        rowKey={(row) => row.id}
        rows={[]}
      />
    );
  }

  if (state === 'loading') {
    return (
      <DataTable
        caption="Words"
        columns={COLUMNS}
        emptyMessage="No words match these filters."
        isLoading
        onCursorChange={() => undefined}
        page={{ nextCursor: null }}
        rowKey={(row) => row.id}
        rows={[]}
      />
    );
  }

  return (
    <DataTable
      caption="Words · arrows move, Enter opens, Tab leaves the grid"
      columns={COLUMNS}
      emptyMessage="No words match these filters."
      onCursorChange={setCursor}
      page={{ nextCursor: cursor === null ? 'day-2-and' : null }}
      rowKey={(row) => row.id}
      rows={rows}
    />
  );
}
