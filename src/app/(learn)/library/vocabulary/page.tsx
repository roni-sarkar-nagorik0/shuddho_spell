import { type ReactElement } from 'react';
import { VocabularyDrill } from '@/components/learning/vocabulary-drill';
import { readVocabulary, readVocabularyDrill } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { VocabularyExplorer } from './vocabulary-explorer';

/**
 * IELTS vocabulary — the plain word, and the one that earns the band.
 *
 * A **reference**, not a lesson, on the same terms as the word families next
 * door: nothing here is drilled into `review_items`, marked, or seeded into
 * `words`. The 28-day course teaches 3,000 words, the families hold 2,299 more
 * built from shared roots, and this holds 777 pairs chosen for one thing — the
 * swap a candidate makes in the exam room.
 * `content/ielts-vocabulary/schema.ts` sets out why all three are separate
 * corpora, and the `course` mark beside a word is the only bridge.
 *
 * Two reads, issued together. The drill at the top is a different question from
 * the list below it — "do I know these" against "what are they" — and a screen
 * that offered only the list would be a dictionary. Both go through the
 * composition root to the same use cases the handlers use; this page never
 * calls its own HTTP API.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;
const DRILL_SIZE = 8;

export default async function VocabularyPage(): Promise<ReactElement> {
  await requireUser();

  const [page, drill] = await Promise.all([
    readVocabulary(PAGE_SIZE),
    readVocabularyDrill(DRILL_SIZE),
  ]);

  return (
    <>
      <header className="col-span-12 flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl tracking-tight text-primary-900">
            IELTS vocabulary
          </h1>
          <span className="num text-muted">
            {page.totalEntries} pairs, {page.totalSynonyms} synonyms
          </span>
        </div>
        <p className="max-w-3xl text-muted">
          Every word here is one you already know. What is beside it is the word an examiner was
          waiting for — <span className="text-primary-900">huge</span> →{' '}
          <span className="text-mastered">vast</span>,{' '}
          <span className="text-primary-900">win</span> →{' '}
          <span className="text-mastered">succeed</span>,{' '}
          <span className="text-primary-900">play down</span> →{' '}
          <span className="text-mastered">minimise</span>. The idea does not change; the band
          does.
        </p>
        <p className="max-w-3xl text-muted">
          Press a word to hear it. Nothing on this screen is invented for the sake of the
          exercise — the wrong answers in the drill are real synonyms belonging to other words,
          drawn from the same {page.totalEntries} pairs.
        </p>
      </header>

      <section className="col-span-12 lg:col-span-5">
        <VocabularyDrill initial={drill} roundSize={DRILL_SIZE} tone="light" />
      </section>

      <section className="col-span-12 lg:col-span-7">
        <VocabularyExplorer initialPage={page} />
      </section>
    </>
  );
}
