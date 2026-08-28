'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import {
  FORM_COLUMNS,
  ruleSentence,
  verbPageSchema,
  type VerbPage,
  type VerbView,
} from '@/components/learning/verb-contracts';
import { apiFetch } from '@/lib/api/client';
import { useSpeech } from '@/lib/audio/use-speech';
import { DICTATION_RATE } from '@/lib/audio/voices';
import { cn } from '@/lib/cn';

export interface IVerbExplorerProps {
  readonly initialPage: VerbPage;
}

const PAGE_SIZE = 50;
const LANG = 'en-GB';

interface IFilters {
  readonly letters: string;
  readonly group: string;
  readonly startsWith: string;
}

const NO_FILTERS: IFilters = { letters: '', group: '', startsWith: '' };

const GROUPS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'core', label: 'The first 100' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'regular', label: 'Regular' },
];

/**
 * The verb reference: five forms a row, filtered and paged.
 *
 * A Client Component because filtering is interaction. The first page arrives
 * from the server render already populated; every page and filter after that
 * comes from `/api/v1/library/verbs`, which runs the same use case the server
 * just ran.
 *
 * **A real table.** Five forms across is what a verb list *is*, and the two
 * sibling references get away with cards because a family and a synonym pair
 * are not tabular. A table also means a screen reader announces "past
 * participle, written" instead of reading five loose words, and that the
 * columns can be scanned down — which is how anybody actually uses this.
 *
 * **The search matches any of the five forms.** A learner who has met `bought`
 * types `bought`; a reference that only searched base forms would answer with
 * nothing at the exact moment it was most needed.
 */
export function VerbExplorer({ initialPage }: IVerbExplorerProps): ReactElement {
  const [page, setPage] = useState<VerbPage>(initialPage);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<IFilters>(NO_FILTERS);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [openVerb, setOpenVerb] = useState<string | null>(null);

  const { supported, say } = useSpeech();

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, startsWith: typed.trim() }));
      setCursor(null);
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [typed]);

  useEffect(() => {
    if (cursor === null && filters === NO_FILTERS) {
      return;
    }

    let live = true;
    setLoading(true);
    setFailed(false);

    void apiFetch('/api/v1/library/verbs', {
      schema: verbPageSchema,
      query: {
        pageSize: PAGE_SIZE,
        after: cursor ?? undefined,
        letters: filters.letters === '' ? undefined : filters.letters,
        group: filters.group === '' ? undefined : filters.group,
        startsWith: filters.startsWith === '' ? undefined : filters.startsWith,
      },
    })
      .then((next) => {
        if (live) {
          setPage(next);
        }
      })
      .catch(() => {
        if (live) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (live) {
          setLoading(false);
        }
      });

    return () => {
      live = false;
    };
  }, [cursor, filters]);

  const set = (patch: Partial<IFilters>): void => {
    setFilters((current) => ({ ...current, ...patch }));
    setCursor(null);
  };

  const filtered = filters !== NO_FILTERS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Find a verb, in any of its forms</span>
            <Glyph
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              name="search"
            />
            <input
              className="w-full rounded-control border border-neutral-300 py-2 pl-10 pr-3"
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              placeholder="go, went, gone, going — any form finds the verb"
              type="search"
              value={typed}
            />
          </label>

          <select
            aria-label="Letters"
            className="rounded-control border border-neutral-300 px-3 py-2"
            onChange={(event) => {
              set({ letters: event.target.value });
            }}
            value={filters.letters}
          >
            <option value="">Every letter</option>
            {page.letters.map((block) => (
              <option key={block.label} value={block.label}>
                {block.label} ({block.verbs})
              </option>
            ))}
          </select>

          <button
            className="rounded-control border border-neutral-300 px-3 py-2 text-muted hover:text-primary-900"
            onClick={() => {
              setTyped('');
              setFilters(NO_FILTERS);
              setCursor(null);
            }}
            type="button"
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="label">Show</span>
          {GROUPS.map((group) => (
            <button
              aria-pressed={filters.group === group.value}
              className={cn(
                'rounded-chip border px-3 py-1',
                filters.group === group.value
                  ? 'border-primary-900 bg-primary-50 text-primary-900'
                  : 'border-neutral-300 text-muted hover:text-primary-900',
              )}
              key={group.value}
              onClick={() => {
                set({ group: filters.group === group.value ? '' : group.value });
              }}
              type="button"
            >
              {group.label}
            </button>
          ))}
          <span className="num ml-auto text-[11px] text-muted">
            {page.irregularVerbs} irregular · {page.coreVerbs} core · {page.withBangla} with Bangla
          </span>
        </div>
      </div>

      <p aria-live="polite" className="num text-muted">
        {filtered
          ? `${String(page.matchedVerbs)} of ${String(page.totalVerbs)} verbs match`
          : `${String(page.totalVerbs)} verbs, all five forms`}
        {loading ? ' · loading…' : ''}
      </p>

      {failed && (
        <p className="rounded-card border border-secondary-300 bg-secondary-100 p-4 text-primary-900">
          The verbs could not be loaded. The filters above still hold what you asked for — try
          again.
        </p>
      )}

      {page.verbs.length === 0 && !loading && (
        <p className="rounded-card border border-hairline bg-neutral-50 p-6 text-muted">
          Nothing matches that. The list holds {page.totalVerbs} verbs — clear a filter and it
          comes back.
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-hairline bg-surface">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Every verb in all five forms. Select a row to see the rule behind each form.
          </caption>
          <thead>
            <tr>
              {FORM_COLUMNS.map((column) => (
                <th className="label h-8 border-b border-hairline px-3" key={column.key}>
                  <span className="num">{column.key}</span>{' '}
                  <span className="font-normal normal-case">{column.name}</span>
                </th>
              ))}
              <th className="label h-8 border-b border-hairline px-3">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {page.verbs.map((verb) => (
              <VerbRow
                isOpen={openVerb === verb.base + (verb.sense ?? '')}
                key={verb.base + (verb.sense ?? '')}
                onSay={(text) => {
                  say(text, DICTATION_RATE, LANG);
                }}
                onToggle={() => {
                  setOpenVerb((current) =>
                    current === verb.base + (verb.sense ?? '')
                      ? null
                      : verb.base + (verb.sense ?? ''),
                  );
                }}
                speakable={supported}
                verb={verb}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          className="rounded-control border border-neutral-300 px-3 py-2 text-muted disabled:opacity-40"
          disabled={cursor === null}
          onClick={() => {
            setCursor(null);
          }}
          type="button"
        >
          Back to the start
        </button>
        <button
          className="rounded-control border border-neutral-300 px-3 py-2 text-primary-900 disabled:opacity-40"
          disabled={page.nextCursor === null}
          onClick={() => {
            setCursor(page.verbs[page.verbs.length - 1]?.base ?? null);
          }}
          type="button"
        >
          More verbs
        </button>
      </div>
    </div>
  );
}

interface IVerbRowProps {
  readonly verb: VerbView;
  readonly isOpen: boolean;
  readonly speakable: boolean;
  readonly onToggle: () => void;
  readonly onSay: (text: string) => void;
}

/**
 * One verb across, and the rules underneath when asked for.
 *
 * The rules are behind a toggle rather than always shown because five sentences
 * under every one of fifty rows is a wall — and because the row itself is what
 * a learner came for. Opening one is the moment they stopped looking a form up
 * and started asking why it is that shape.
 */
function VerbRow({ verb, isOpen, speakable, onToggle, onSay }: IVerbRowProps): ReactElement {
  const forms = [verb.past, verb.participle, verb.presentParticiple, verb.thirdPerson];
  const cells = [
    { form: verb.base, rule: null },
    ...forms.map((form) => ({ form: form.form, rule: form.rule })),
  ];

  return (
    <>
      <tr className={cn('border-b border-hairline', isOpen && 'bg-primary-50')}>
        {cells.map((cell, position) => (
          <td className="h-9 px-3" key={cell.form + String(position)}>
            <span className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  position === 0 ? 'font-medium text-primary-900' : 'text-primary-900',
                  cell.rule === 'irregular' && 'text-secondary-700',
                )}
              >
                {cell.form}
              </span>
              {speakable && (
                <button
                  aria-label={`Hear ${cell.form}`}
                  className="text-neutral-300 hover:text-primary-900"
                  onClick={() => {
                    onSay(cell.form);
                  }}
                  type="button"
                >
                  <Glyph name="play" />
                </button>
              )}
            </span>
          </td>
        ))}
        <td className="h-9 px-3">
          <span className="flex flex-wrap items-baseline gap-2">
            {verb.banglaMeaning !== null && (
              <span className="font-bengali text-muted" lang="bn">
                {verb.banglaMeaning}
              </span>
            )}
            {verb.sense !== null && <span className="text-muted">({verb.sense})</span>}
            {verb.isCore && (
              <span className="rounded-chip bg-primary-100 px-1 text-[0.625rem] uppercase text-primary-900">
                first 100
              </span>
            )}
            {verb.inCourse && (
              <span
                className="rounded-chip bg-primary-100 px-1 text-[0.625rem] uppercase text-primary-900"
                title="Also taught in the 28-day course"
              >
                course
              </span>
            )}
            <button
              aria-expanded={isOpen}
              className="ml-auto text-[11px] text-primary-900 hover:underline"
              onClick={onToggle}
              type="button"
            >
              {isOpen ? 'Hide' : 'Why?'}
            </button>
          </span>
        </td>
      </tr>

      {isOpen && (
        <tr className="border-b border-hairline bg-primary-50">
          <td className="px-3 pb-3" colSpan={6}>
            <ul className="flex flex-col gap-1">
              {forms.map((form, position) => (
                <li className="flex flex-wrap items-baseline gap-2" key={form.form + String(position)}>
                  <span className="num w-8 text-[11px] text-muted">
                    {FORM_COLUMNS[position + 1]?.key}
                  </span>
                  <span className="font-mono text-primary-900">{form.form}</span>
                  <span className="text-muted">{ruleSentence(form.rule)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
