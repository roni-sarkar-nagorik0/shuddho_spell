'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { Glyph } from '@/components/icons/glyph';
import {
  shortPos,
  vocabularyPageSchema,
  type VocabularyEntryView,
  type VocabularyPage,
} from '@/components/learning/vocabulary-contracts';
import { apiFetch } from '@/lib/api/client';
import { useSpeech } from '@/lib/audio/use-speech';
import { DICTATION_RATE, SENTENCE_RATE } from '@/lib/audio/voices';
import { cn } from '@/lib/cn';

export interface IVocabularyExplorerProps {
  readonly initialPage: VocabularyPage;
}

const PAGE_SIZE = 24;
const LANG = 'en-GB';

interface IFilters {
  readonly topic: string;
  readonly partOfSpeech: string;
  readonly startsWith: string;
}

const NO_FILTERS: IFilters = { topic: '', partOfSpeech: '', startsWith: '' };

/**
 * The vocabulary reference: filter, page, and one row per pair.
 *
 * A Client Component because filtering is interaction. The first page arrives
 * from the server render already populated; every page and every filter after
 * that comes from `/api/v1/library/vocabulary`, which runs the same use case
 * the server just ran. One implementation, two callers — the arrangement the
 * families explorer uses next door, and the sweep in
 * `src/composition/one-implementation.test.ts` is what keeps it honest.
 *
 * **The search box matches synonyms as well as headwords.** Half the reason to
 * open this screen is having the plain word and wanting the better one, and a
 * corpus filed under the better one answers `huge` with nothing unless the
 * synonyms are searched too. `VocabularyEntry.matches` is where that happens.
 *
 * **Rows, not cards.** The families screen uses cards because a family is six
 * words and a rule; a pair is two words, and a card around two words is an
 * empty box. Twenty-four rows also mean the page can be read down the left edge
 * — which is how anybody actually uses a synonym list.
 */
export function VocabularyExplorer({ initialPage }: IVocabularyExplorerProps): ReactElement {
  const [page, setPage] = useState<VocabularyPage>(initialPage);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<IFilters>(NO_FILTERS);
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * The search box is debounced, the selects are not — the same split the
   * families explorer makes. Typing `environ` is seven keystrokes and would be
   * seven requests; a topic is one click, and a quarter-second of nothing after
   * a click reads as a broken control.
   */
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
    // The unfiltered first page is already in state from the server render.
    if (cursor === null && filters === NO_FILTERS) {
      return;
    }

    let live = true;
    setLoading(true);
    setFailed(false);

    void apiFetch('/api/v1/library/vocabulary', {
      schema: vocabularyPageSchema,
      query: {
        pageSize: PAGE_SIZE,
        after: cursor ?? undefined,
        topic: filters.topic === '' ? undefined : filters.topic,
        partOfSpeech: filters.partOfSpeech === '' ? undefined : filters.partOfSpeech,
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Find a word or a synonym</span>
            <Glyph
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              name="search"
            />
            <input
              className="w-full rounded-control border border-neutral-300 py-2 pl-10 pr-3"
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              placeholder="huge, vast, incre… — headwords and synonyms both"
              type="search"
              value={typed}
            />
          </label>

          <select
            aria-label="Topic"
            className="rounded-control border border-neutral-300 px-3 py-2"
            onChange={(event) => {
              set({ topic: event.target.value });
            }}
            value={filters.topic}
          >
            <option value="">Every topic</option>
            {page.topics.map((topic) => (
              <option key={topic.topic} value={topic.topic}>
                {topic.topic} ({topic.entries})
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
          <span className="label">Part of speech</span>
          {page.partsOfSpeech.map((entry) => (
            <button
              aria-pressed={filters.partOfSpeech === entry.partOfSpeech}
              className={cn(
                'rounded-chip border px-3 py-1 capitalize',
                filters.partOfSpeech === entry.partOfSpeech
                  ? 'border-primary-900 bg-primary-50 text-primary-900'
                  : 'border-neutral-300 text-muted hover:text-primary-900',
              )}
              key={entry.partOfSpeech}
              onClick={() => {
                set({
                  partOfSpeech:
                    filters.partOfSpeech === entry.partOfSpeech ? '' : entry.partOfSpeech,
                });
              }}
              type="button"
            >
              {entry.partOfSpeech} <span className="num text-[11px]">{entry.entries}</span>
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="num text-muted">
        {filtered
          ? `${String(page.matchedEntries)} of ${String(page.totalEntries)} pairs match`
          : `${String(page.totalEntries)} pairs · ${String(page.totalSynonyms)} synonyms`}
        {loading ? ' · loading…' : ''}
      </p>

      {failed && (
        <p className="rounded-card border border-secondary-300 bg-secondary-100 p-4 text-primary-900">
          The list could not be loaded. The filters above still hold what you asked for — try
          again.
        </p>
      )}

      {page.entries.length === 0 && !loading && (
        <p className="rounded-card border border-hairline bg-neutral-50 p-6 text-muted">
          Nothing matches that. The list holds {page.totalEntries} pairs — clear a filter and it
          comes back.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {page.entries.map((entry) => (
          <EntryRow entry={entry} key={entry.word} />
        ))}
      </ul>

      <div className="flex items-center justify-between">
        {/*
          Next and back-to-the-start, not next and previous — a keyset cursor
          walks forward, and a Back that silently returned to the first page
          would be worse than not offering one. The families pager says the
          same thing at more length.
        */}
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
            setCursor(page.entries[page.entries.length - 1]?.word ?? null);
          }}
          type="button"
        >
          More pairs
        </button>
      </div>
    </div>
  );
}

/**
 * One pair: the word, what it can be swapped for, and a button that says it.
 *
 * The arrow is the whole idea of the screen in one character — this word
 * *becomes* that one — and it points from the headword to the swap rather than
 * sitting between two equal things.
 */
function EntryRow({ entry }: { readonly entry: VocabularyEntryView }): ReactElement {
  const { supported, say } = useSpeech();
  const [best, ...rest] = entry.synonyms;

  return (
    <li className="flex items-baseline gap-3 rounded-card border border-hairline bg-surface px-3 py-2">
      {supported && (
        <button
          aria-label={`Hear ${entry.word}`}
          className="text-neutral-300 hover:text-primary-900"
          onClick={() => {
            say(entry.word, entry.isPhrase ? SENTENCE_RATE : DICTATION_RATE, LANG);
          }}
          type="button"
        >
          <Glyph name="play" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-primary-900">{entry.word}</span>
          <span className="num text-[11px] text-muted">{shortPos(entry.partOfSpeech)}</span>
          <span className="text-muted">→</span>
          <span className="text-mastered">{best}</span>
          {entry.inCourse && (
            <span
              className="rounded-chip bg-primary-100 px-1 text-[0.625rem] uppercase text-primary-900"
              title="Also taught in the 28-day course"
            >
              course
            </span>
          )}
        </p>
        {rest.length > 0 && (
          <p className="text-muted">
            also{' '}
            {rest.map((synonym, position) => (
              <span key={synonym}>
                {position > 0 && ', '}
                {supported ? (
                  <button
                    className="hover:text-primary-900 hover:underline"
                    onClick={() => {
                      say(synonym, synonym.includes(' ') ? SENTENCE_RATE : DICTATION_RATE, LANG);
                    }}
                    title={`Hear ${synonym}`}
                    type="button"
                  >
                    {synonym}
                  </button>
                ) : (
                  synonym
                )}
              </span>
            ))}
          </p>
        )}
      </div>

      <span className="text-[11px] capitalize text-muted">{entry.topic}</span>
    </li>
  );
}
