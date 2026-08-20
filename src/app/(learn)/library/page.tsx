import { type ReactElement } from 'react';
import { readLibraryPage, readRuleFamilies } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { LibraryTable } from './library-table';

/**
 * The word library.
 *
 * The first page is resolved on the server through the composition root, so the
 * table is populated on first paint instead of after a round trip. Every page
 * after that comes from `/api/v1/library` — the same use case, reached the other
 * way. One implementation, two callers.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

export default async function LibraryPage(): Promise<ReactElement> {
  const user = await requireUser();

  const [page, ruleFamilies] = await Promise.all([
    readLibraryPage(user.userId, PAGE_SIZE),
    readRuleFamilies(),
  ]);

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Library</h1>
        <span className="num text-muted">every word in the programme</span>
      </header>

      <section className="col-span-12">
        <LibraryTable
          initialPage={page}
          partsOfSpeech={PARTS_OF_SPEECH_OPTIONS}
          ruleFamilies={ruleFamilies}
        />
      </section>
    </>
  );
}

/**
 * Restated rather than imported: `src/app` may not reach into a module's
 * domain, and these nine strings are 002's `words_part_of_speech_check`. A
 * tenth would fail the constraint long before it reached this list.
 */
const PARTS_OF_SPEECH_OPTIONS: readonly string[] = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
];
