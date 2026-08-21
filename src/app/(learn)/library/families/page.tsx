import { type ReactElement } from 'react';
import { readWordFamilies } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { FamilyExplorer } from './family-explorer';

/**
 * Word families — one root, the words English builds from it, and the rule.
 *
 * A **reference**, not a lesson. Nothing here is drilled, marked or seeded into
 * `words`: the 28-day course teaches 1,240 words and this holds 2,299 more,
 * chosen for the four IELTS papers. The two corpora are kept apart on purpose
 * — `content/word-families/schema.ts` sets out why — and the only bridge is the
 * `course` mark beside a word that appears in both.
 *
 * The first page is resolved on the server through the composition root, so the
 * cards are populated on first paint. Every filter and every page after that
 * comes from `/api/v1/library/families` — the same use case, reached the other
 * way.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

export default async function WordFamiliesPage(): Promise<ReactElement> {
  await requireUser();

  const page = await readWordFamilies(PAGE_SIZE);

  return (
    <>
      <header className="col-span-12 flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl tracking-tight text-primary-900">Word families</h1>
          <span className="num text-muted">
            {page.totalWords} IELTS words, from {page.totalFamilies} roots
          </span>
        </div>
        <p className="max-w-3xl text-sm text-muted">
          One root, and everything English builds from it.{' '}
          <span className="text-primary-900">happy → happier → happily → happiness</span> is not
          four words to memorise; it is one word and one rule — the y becomes an i. Learn the rule
          here and it carries to <span className="text-primary-900">carry</span>,{' '}
          <span className="text-primary-900">beauty</span> and{' '}
          <span className="text-primary-900">busy</span> without being taught again.
        </p>
        <p className="max-w-3xl text-sm text-muted">
          The change beside each word is <em>derived</em>, not written down: the screen compares the
          word to its root and reports what it finds. Where nothing regular connects them —{' '}
          <span className="text-primary-900">speak → spoke</span> — it says{' '}
          <span className="num">irregular</span> rather than inventing a rule.
        </p>
      </header>

      <section className="col-span-12">
        <FamilyExplorer initialPage={page} />
      </section>
    </>
  );
}
