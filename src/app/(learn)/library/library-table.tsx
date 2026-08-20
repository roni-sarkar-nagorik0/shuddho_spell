'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { DataTable, type IColumn } from '@/components/data/data-table';
import { Glyph } from '@/components/icons/glyph';
import { Drawer } from '@/components/overlays/drawer';
import { Popover } from '@/components/overlays/popover';
import { HeatCell } from '@/components/primitives/heat-cell';
import { MonoValue } from '@/components/primitives/mono-value';
import { StatusBadge } from '@/components/primitives/status-badge';
import { apiFetch } from '@/lib/api/client';
import { toCsv } from './csv';
import {
  COLUMN_LABELS,
  libraryPageSchema,
  OPTIONAL_COLUMNS,
  type LibraryPage,
  type LibraryWord,
  type OptionalColumn,
} from './library-contracts';

export interface ILibraryTableProps {
  readonly initialPage: LibraryPage;
  readonly partsOfSpeech: readonly string[];
  readonly ruleFamilies: readonly { readonly id: string; readonly code: string }[];
}

const PAGE_SIZE = 25;

interface IFilters {
  readonly contains: string;
  readonly weekIndex: string;
  readonly partOfSpeech: string;
  readonly ruleFamilyId: string;
}

const NO_FILTERS: IFilters = { contains: '', weekIndex: '', partOfSpeech: '', ruleFamilyId: '' };

/**
 * The dense word table: filters, column control, CSV export, detail drawer,
 * cursor pagination.
 *
 * A Client Component, because `DataTable` takes render functions and because
 * filtering is interaction. The first page is rendered on the server and handed
 * in, so the table is populated on first paint rather than after a round trip —
 * every page after that comes from `/api/v1/library`, which runs the same use
 * case the server did.
 *
 * The export writes what is **on screen**: the visible columns, the current
 * page, the current filters. An export that quietly returned something else
 * would be worse than no export.
 */
export function LibraryTable({
  initialPage,
  partsOfSpeech,
  ruleFamilies,
}: ILibraryTableProps): ReactElement {
  const [page, setPage] = useState<LibraryPage>(initialPage);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<IFilters>(NO_FILTERS);
  const [applied, setApplied] = useState<IFilters>(NO_FILTERS);
  const [hidden, setHidden] = useState<readonly OptionalColumn[]>([]);
  const [selected, setSelected] = useState<LibraryWord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The first page for the unfiltered view is already in state from the
    // server render; refetching it on mount would be a wasted round trip.
    if (cursor === null && applied === NO_FILTERS) {
      return;
    }

    setLoading(true);

    void apiFetch('/api/v1/library', {
      schema: libraryPageSchema,
      query: {
        pageSize: PAGE_SIZE,
        after: cursor ?? undefined,
        contains: applied.contains === '' ? undefined : applied.contains,
        weekIndex: applied.weekIndex === '' ? undefined : Number(applied.weekIndex),
        partOfSpeech: applied.partOfSpeech === '' ? undefined : applied.partOfSpeech,
        ruleFamilyId: applied.ruleFamilyId === '' ? undefined : applied.ruleFamilyId,
      },
    })
      .then(setPage)
      .catch(() => { setPage({ words: [], nextCursor: null }); })
      .finally(() => { setLoading(false); });
  }, [cursor, applied]);

  const visible = useCallback(
    (column: OptionalColumn): boolean => !hidden.includes(column),
    [hidden],
  );

  const columns = useMemo((): readonly IColumn<LibraryWord>[] => {
    const all: readonly (IColumn<LibraryWord> & { readonly optional?: OptionalColumn })[] = [
      { id: 'text', header: 'Word', pinned: true, width: '11rem', render: (row) => row.text },
      {
        id: 'ipa',
        optional: 'ipa',
        header: 'IPA',
        width: '9rem',
        render: (row) => <span className="num text-muted">/{row.ipa}/</span>,
      },
      {
        id: 'bangla',
        optional: 'bangla',
        header: 'Bangla sound',
        width: '9rem',
        render: (row) => (
          <span className="font-bengali" lang="bn">
            {row.banglaSound}
          </span>
        ),
      },
      {
        id: 'meaning',
        optional: 'meaning',
        header: 'Meaning',
        width: '12rem',
        render: (row) => (
          <span className="font-bengali" lang="bn">
            {row.banglaMeaning}
          </span>
        ),
      },
      {
        id: 'partOfSpeech',
        optional: 'partOfSpeech',
        header: 'Part of speech',
        width: '9rem',
        render: (row) => row.partOfSpeech,
      },
      { id: 'week', optional: 'week', header: 'Week', numeric: true, width: '5rem', render: (row) => row.weekIndex },
      {
        id: 'rule',
        optional: 'rule',
        header: 'Rule family',
        width: '12rem',
        render: (row) => row.ruleFamilyCode ?? <span className="text-muted">—</span>,
      },
      {
        id: 'accuracy',
        optional: 'accuracy',
        header: 'Your accuracy',
        numeric: true,
        width: '9rem',
        render: (row) => (
          <span className="flex items-center justify-end gap-1.5">
            <HeatCell accuracy={row.accuracy} label={row.text} size="sm" />
            {row.accuracy === null ? 'never wrong' : `${String(Math.round(row.accuracy * 100))}%`}
          </span>
        ),
      },
    ];

    return all.filter((column) => column.optional === undefined || visible(column.optional));
  }, [visible]);

  const exportCsv = (): void => {
    const headers = ['Word', ...OPTIONAL_COLUMNS.filter(visible).map((key) => COLUMN_LABELS[key])];

    const rows = page.words.map((word) => {
      const cells: Readonly<Record<OptionalColumn, string>> = {
        ipa: word.ipa,
        bangla: word.banglaSound,
        meaning: word.banglaMeaning,
        partOfSpeech: word.partOfSpeech,
        week: String(word.weekIndex),
        rule: word.ruleFamilyCode ?? '',
        accuracy: word.accuracy === null ? '' : String(Math.round(word.accuracy * 100)),
      };

      return [word.text, ...OPTIONAL_COLUMNS.filter(visible).map((key) => cells[key])];
    });

    const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'shuddhospell-library.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyFilters = (): void => {
    setCursor(null);
    setApplied(filters);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Contains</span>
          <input
            className="h-8 w-40 rounded-control border border-hairline px-2"
            onChange={(event) => { setFilters((current) => ({ ...current, contains: event.target.value })); }}
            onKeyDown={(event) => { if (event.key === 'Enter') { applyFilters(); } }}
            spellCheck={false}
            value={filters.contains}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Week</span>
          <select
            className="h-8 w-24 rounded-control border border-hairline px-2"
            onChange={(event) => { setFilters((current) => ({ ...current, weekIndex: event.target.value })); }}
            value={filters.weekIndex}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4].map((week) => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Part of speech</span>
          <select
            className="h-8 w-36 rounded-control border border-hairline px-2"
            onChange={(event) => { setFilters((current) => ({ ...current, partOfSpeech: event.target.value })); }}
            value={filters.partOfSpeech}
          >
            <option value="">Any</option>
            {partsOfSpeech.map((part) => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Rule family</span>
          <select
            className="h-8 w-48 rounded-control border border-hairline px-2"
            onChange={(event) => { setFilters((current) => ({ ...current, ruleFamilyId: event.target.value })); }}
            value={filters.ruleFamilyId}
          >
            <option value="">Any</option>
            {ruleFamilies.map((family) => (
              <option key={family.id} value={family.id}>
                {family.code}
              </option>
            ))}
          </select>
        </label>

        <button
          className="h-8 rounded-control bg-primary-900 px-3 text-surface"
          onClick={applyFilters}
          type="button"
        >
          Apply
        </button>

        <button
          className="h-8 rounded-control border border-primary-900 px-3 text-primary-900"
          onClick={() => { setFilters(NO_FILTERS); setApplied(NO_FILTERS); setCursor(null); }}
          type="button"
        >
          Clear
        </button>

        <span className="ml-auto flex items-center gap-2">
          <Popover
            align="right"
            trigger={<Glyph name="settings" size={16} />}
            triggerLabel="Choose columns"
          >
            <p className="label">Columns</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {OPTIONAL_COLUMNS.map((column) => (
                <li key={column}>
                  <label className="flex items-center gap-2">
                    <input
                      checked={visible(column)}
                      onChange={() => {
                        setHidden((current) =>
                          current.includes(column)
                            ? current.filter((entry) => entry !== column)
                            : [...current, column],
                        );
                      }}
                      type="checkbox"
                    />
                    {COLUMN_LABELS[column]}
                  </label>
                </li>
              ))}
            </ul>
          </Popover>

          <button
            className="flex h-8 items-center gap-1.5 rounded-control border border-primary-900 px-3 text-primary-900"
            onClick={exportCsv}
            type="button"
          >
            <Glyph name="download" size={14} />
            CSV
          </button>
        </span>
      </div>

      <DataTable
        caption="Word library · arrows move, Enter opens the detail"
        columns={columns}
        emptyMessage="No words match these filters."
        isLoading={loading}
        onActivate={setSelected}
        onCursorChange={setCursor}
        page={{ nextCursor: page.nextCursor }}
        rowKey={(row) => row.id}
        rows={page.words}
      />

      <Drawer onClose={() => { setSelected(null); }} open={selected !== null} title={selected?.text ?? ''}>
        {selected !== null && (
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="label">Transcription</dt>
              <dd className="num">/{selected.ipa}/ · {selected.syllables.join(' · ')}</dd>
            </div>
            <div>
              <dt className="label">Bangla</dt>
              <dd className="font-bengali" lang="bn">
                {selected.banglaSound} — {selected.banglaMeaning}
              </dd>
            </div>
            <div>
              <dt className="label">Placement</dt>
              <dd>
                Week <MonoValue size="sm" value={selected.weekIndex} />
                {selected.frequencyRank !== null && (
                  <>
                    {' · rank '}
                    <MonoValue size="sm" value={selected.frequencyRank} />
                  </>
                )}
                {selected.ruleFamilyCode !== null && ` · ${selected.ruleFamilyCode}`}
              </dd>
            </div>
            <div>
              <dt className="label">Your record</dt>
              <dd className="flex flex-wrap items-center gap-2">
                {selected.timesSeen === 0 ? (
                  <span className="text-muted">You have never got this one wrong.</span>
                ) : (
                  <>
                    <MonoValue
                      unit="%"
                      value={Math.round((selected.accuracy ?? 0) * 100)}
                    />
                    <span className="num text-muted">over {selected.timesSeen} reviews</span>
                  </>
                )}
                {selected.isMastered && <StatusBadge label="Mastered" tone="passed" />}
              </dd>
            </div>
          </dl>
        )}
      </Drawer>
    </div>
  );
}
