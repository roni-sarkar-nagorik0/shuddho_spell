import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { readPractiseLog } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { WordRows } from './word-rows';

/**
 * Every word this learner has practised, paged.
 *
 * A screen of its own rather than a panel, because a history grows and a
 * dashboard is a summary: the demo alone can produce dozens of rows in an
 * afternoon, and a panel that long stops being a summary of anything. The
 * dashboard keeps today's counts and links here.
 *
 * **The URL is the state.** The page number and the source filter are query
 * parameters read on the server, the controls are plain links, and there is no
 * client-side fetching at all — so the back button works, a page is
 * shareable, and a reload lands where the learner was. A filter held in React
 * state would have none of those properties and would cost a round trip to
 * discover the first row.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCES = Object.freeze([
  { value: 'all', label: 'Everything' },
  { value: 'course', label: 'In the course' },
  { value: 'demo', label: 'On the demo' },
] as const);

type SourceValue = (typeof SOURCES)[number]['value'];

/**
 * A query string is not a type. `?source=drop%20table` and `?page=-4` arrive as
 * readily as anything else, so both are narrowed here — the use case clamps the
 * page as well, because a screen is not the only caller it could ever have.
 */
function readSource(value: string | undefined): SourceValue {
  return SOURCES.find((source) => source.value === value)?.value ?? 'all';
}

function readPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '1', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function WordsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | readonly string[] | undefined>>;
}): Promise<ReactElement> {
  const [user, params] = await Promise.all([requireUser(), searchParams]);

  const raw = params['source'];
  const rawPage = params['page'];
  const source = readSource(typeof raw === 'string' ? raw : undefined);
  const page = readPage(typeof rawPage === 'string' ? rawPage : undefined);

  const log = await readPractiseLog(user.userId, source, page);

  const href = (next: { readonly source?: SourceValue; readonly page?: number }): string => {
    const query = new URLSearchParams();
    const chosen = next.source ?? source;
    const target = next.page ?? log.page;

    if (chosen !== 'all') {
      query.set('source', chosen);
    }

    if (target > 1) {
      query.set('page', String(target));
    }

    return query.size === 0 ? '/words' : `/words?${query.toString()}`;
  };

  return (
    <>
      <header className="col-span-12 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">My words</h1>
        <span className="flex items-baseline gap-1.5">
          <MonoValue size="sm" value={String(log.totalWords)} />
          <span className="text-muted">
            {log.totalWords === 1 ? 'word practised' : 'words practised'}
          </span>
        </span>
      </header>

      <nav aria-label="Filter by where the word was practised" className="col-span-12 flex flex-wrap gap-2">
        {SOURCES.map((option) => (
          <Link
            aria-current={option.value === source ? 'page' : undefined}
            className={
              option.value === source
                ? 'flex h-9 items-center rounded-control bg-primary-100 px-3 font-medium text-primary-900'
                : 'flex h-9 items-center rounded-control border border-hairline bg-surface px-3 text-neutral-700 hover:bg-primary-50'
            }
            // Changing the filter goes back to page one. Staying on page 7 of a
            // list that now has two pages is the classic filter bug.
            href={href({ source: option.value, page: 1 })}
            key={option.value}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      <section className="col-span-12">
        {log.words.length === 0 ? (
          <p className="text-muted">
            {source === 'demo'
              ? 'Nothing from the front-page drill yet.'
              : source === 'course'
                ? 'Nothing from a lesson yet.'
                : 'No words yet. A lesson or the drill on the front page both count here.'}
          </p>
        ) : (
          <WordRows words={log.words} />
        )}
      </section>

      {log.pageCount > 1 && (
        <nav
          aria-label="Pages"
          className="col-span-12 flex items-center justify-between gap-3 text-muted"
        >
          {/*
            Previous and next only, with the position spelled out. Numbered
            links to every page is a control built for a list somebody browses;
            this one is read from the front, and twenty numbered links across
            the bottom of a phone is worse than one sentence.
          */}
          <PageLink disabled={log.page <= 1} href={href({ page: log.page - 1 })} label="Previous" />

          <span className="num">
            Page {log.page} of {log.pageCount}
          </span>

          <PageLink
            disabled={log.page >= log.pageCount}
            href={href({ page: log.page + 1 })}
            label="Next"
          />
        </nav>
      )}
    </>
  );
}

function PageLink({
  href,
  label,
  disabled,
}: {
  readonly href: string;
  readonly label: string;
  readonly disabled: boolean;
}): ReactElement {
  if (disabled) {
    // A span, not a disabled link. There is no such thing as a disabled anchor
    // — `aria-disabled` on one still lands a keyboard user on it — so the
    // element itself changes rather than being dressed to look inert.
    return <span className="flex h-9 items-center px-3 text-cold">{label}</span>;
  }

  return (
    <Link
      className="flex h-9 items-center rounded-control border border-hairline bg-surface px-3 text-primary-900 hover:bg-primary-50"
      href={href}
    >
      {label}
    </Link>
  );
}
