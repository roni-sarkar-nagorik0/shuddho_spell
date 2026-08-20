'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Glyph } from '@/components/icons/glyph';
import { cn } from '@/lib/cn';

export interface IColumn<TRow> {
  readonly id: string;
  readonly header: string;
  readonly render: (row: TRow) => ReactNode;
  /** Numeric columns are mono, tabular and right-aligned. Every number in the product is. */
  readonly numeric?: boolean;
  /**
   * Pinned columns stay put while the table scrolls sideways. A pinned column
   * **must** declare a width — the sticky offset of the second pinned column is
   * the sum of the widths before it, and there is nothing to sum otherwise.
   */
  readonly pinned?: boolean;
  /** A CSS length. Required when pinned, optional otherwise. */
  readonly width?: string;
}

export interface ICursorPage {
  /** The cursor for the page after this one, or `null` when this is the last. */
  readonly nextCursor: string | null;
}

export interface IDataTableProps<TRow> {
  readonly rows: readonly TRow[];
  readonly columns: readonly IColumn<TRow>[];
  readonly rowKey: (row: TRow) => string;
  /** Read by screen readers before the table. Never visually hidden decoration. */
  readonly caption: string;
  readonly page: ICursorPage;
  /**
   * Called with the cursor to load. `null` means the first page — the table
   * keeps the stack of cursors it has walked so Previous is exact rather than
   * an offset guess.
   */
  readonly onCursorChange: (cursor: string | null) => void;
  readonly onActivate?: (row: TRow) => void;
  readonly emptyMessage: string;
  readonly isLoading?: boolean;
  readonly className?: string;
}

/** Cumulative left offset for each pinned column, in source order. */
function pinnedOffsets<TRow>(columns: readonly IColumn<TRow>[]): Readonly<Record<string, string>> {
  const offsets: Record<string, string> = {};
  const widths: string[] = [];

  for (const column of columns) {
    if (column.pinned !== true) {
      continue;
    }

    offsets[column.id] = widths.length === 0 ? '0px' : `calc(${widths.join(' + ')})`;
    widths.push(column.width ?? '0px');
  }

  return offsets;
}

interface IFocusCell {
  readonly row: number;
  readonly column: number;
}

/**
 * The dense table the library, the program, the weak-spots list and the exam
 * review all sit on. 32px rows, sticky header, pinned first columns, cursor
 * pagination.
 *
 * **Cursor, never offset.** `11-api-surface.md` is explicit, and the reason is
 * that rows are inserted under the learner while they read: an offset page 2
 * silently repeats or skips whatever moved across the boundary. The table holds
 * the stack of cursors it has walked, so Previous returns to a page that
 * actually existed instead of subtracting a page size.
 *
 * **Keyboard is the primary path, not a courtesy.** This is an ARIA grid with
 * roving focus: exactly one cell is tabbable, arrows move in both axes, Home
 * and End go to the ends of the row, Ctrl with them to the ends of the table,
 * and Enter activates the row. Tab therefore steps *past* the table rather than
 * through several hundred cells, which is the behaviour that makes a dense
 * table usable without a mouse.
 */
export function DataTable<TRow>({
  rows,
  columns,
  rowKey,
  caption,
  page,
  onCursorChange,
  onActivate,
  emptyMessage,
  isLoading = false,
  className,
}: IDataTableProps<TRow>): ReactElement {
  const [cursorStack, setCursorStack] = useState<readonly string[]>([]);
  const [focus, setFocus] = useState<IFocusCell>({ row: 0, column: 0 });
  const cells = useRef(new Map<string, HTMLTableCellElement>());
  const shouldFocus = useRef(false);
  const offsets = pinnedOffsets(columns);

  useEffect(() => {
    if (!shouldFocus.current) {
      return;
    }

    shouldFocus.current = false;
    cells.current.get(`${String(focus.row)}:${String(focus.column)}`)?.focus();
  }, [focus]);

  const move = useCallback(
    (rowDelta: number, columnDelta: number) => {
      shouldFocus.current = true;
      setFocus((current) => ({
        row: Math.min(rows.length - 1, Math.max(0, current.row + rowDelta)),
        column: Math.min(columns.length - 1, Math.max(0, current.column + columnDelta)),
      }));
    },
    [rows.length, columns.length],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableSectionElement>) => {
      const jumpRows = event.ctrlKey || event.metaKey;

      switch (event.key) {
        case 'ArrowDown':
          move(1, 0);
          break;
        case 'ArrowUp':
          move(-1, 0);
          break;
        case 'ArrowRight':
          move(0, 1);
          break;
        case 'ArrowLeft':
          move(0, -1);
          break;
        case 'Home':
          shouldFocus.current = true;
          setFocus((current) => ({ row: jumpRows ? 0 : current.row, column: 0 }));
          break;
        case 'End':
          shouldFocus.current = true;
          setFocus((current) => ({
            row: jumpRows ? rows.length - 1 : current.row,
            column: columns.length - 1,
          }));
          break;
        case 'Enter': {
          const row = rows[focus.row];
          if (onActivate !== undefined && row !== undefined) {
            onActivate(row);
          }
          break;
        }
        default:
          return;
      }

      event.preventDefault();
    },
    [move, rows, columns.length, focus.row, onActivate],
  );

  const goNext = (): void => {
    if (page.nextCursor === null) {
      return;
    }

    setCursorStack((stack) => [...stack, page.nextCursor ?? '']);
    setFocus({ row: 0, column: 0 });
    onCursorChange(page.nextCursor);
  };

  const goPrevious = (): void => {
    setCursorStack((stack) => {
      const next = stack.slice(0, -1);
      setFocus({ row: 0, column: 0 });
      onCursorChange(next.at(-1) ?? null);
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="overflow-auto rounded-card border border-hairline bg-surface">
        <table className="w-full border-collapse text-left" role="grid">
          <caption className="label border-b border-hairline px-3 py-2 text-left">
            {caption}
          </caption>

          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className={cn(
                    'label sticky top-0 z-20 h-8 whitespace-nowrap border-b border-hairline bg-surface px-3',
                    column.numeric === true && 'text-right',
                    column.pinned === true && 'z-30 border-r',
                  )}
                  key={column.id}
                  scope="col"
                  style={{
                    width: column.width,
                    left: column.pinned === true ? offsets[column.id] : undefined,
                    position: column.pinned === true ? 'sticky' : undefined,
                  }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody onKeyDown={onKeyDown}>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted" colSpan={columns.length}>
                  {isLoading ? '…' : emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr className="h-8 border-b border-hairline last:border-b-0" key={rowKey(row)}>
                  {columns.map((column, columnIndex) => {
                    const tabbable = focus.row === rowIndex && focus.column === columnIndex;

                    return (
                      <td
                        className={cn(
                          'h-8 whitespace-nowrap px-3',
                          column.numeric === true && 'num text-right',
                          column.pinned === true && 'z-10 border-r border-hairline bg-surface',
                        )}
                        key={column.id}
                        onClick={() => { setFocus({ row: rowIndex, column: columnIndex }); }}
                        ref={(element) => {
                          const key = `${String(rowIndex)}:${String(columnIndex)}`;
                          if (element === null) {
                            cells.current.delete(key);
                          } else {
                            cells.current.set(key, element);
                          }
                        }}
                        role="gridcell"
                        style={{
                          left: column.pinned === true ? offsets[column.id] : undefined,
                          position: column.pinned === true ? 'sticky' : undefined,
                        }}
                        tabIndex={tabbable ? 0 : -1}
                      >
                        {column.render(row)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex h-8 items-center gap-1.5 rounded-control border border-primary-900 px-2.5 text-primary-900 disabled:border-cold disabled:text-cold"
          disabled={cursorStack.length === 0 || isLoading}
          onClick={goPrevious}
          type="button"
        >
          <Glyph name="chevron-left" size={14} />
          Previous
        </button>

        <button
          className="flex h-8 items-center gap-1.5 rounded-control border border-primary-900 px-2.5 text-primary-900 disabled:border-cold disabled:text-cold"
          disabled={page.nextCursor === null || isLoading}
          onClick={goNext}
          type="button"
        >
          Next
          <Glyph name="chevron-right" size={14} />
        </button>

        <span aria-live="polite" className="num ml-auto text-[11px] text-muted">
          Page {cursorStack.length + 1} · {rows.length} rows
        </span>
      </div>
    </div>
  );
}
