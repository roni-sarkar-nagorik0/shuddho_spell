import { type ReactElement } from 'react';
import { VerbDrill } from '@/components/learning/verb-drill';
import {
  CommonMistakes,
  FormKey,
  SpellingRules,
  TenseChart,
} from '@/components/learning/verb-guide';
import { readVerbDrill, readVerbs } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { VerbExplorer } from './verb-explorer';

/**
 * Verb forms — V1 to V5, for 998 verbs.
 *
 * A **reference with a lesson in front of it**, which is the one way this
 * screen differs from the two beside it. A word family or a synonym pair can be
 * read cold; a verb table cannot, because "V3" means nothing to somebody who
 * has not been told. So the page is ordered the way it has to be learnt: what
 * the five forms *are*, then a drill on them, then the thousand rows, then the
 * spelling rules and the eight mistakes.
 *
 * Nothing here is drilled into `review_items`, marked, or seeded into `words`.
 * `content/verb-forms/schema.ts` sets out where the corpus comes from — a
 * thousand-row reference list, read row by row — and why 764 of the verbs are
 * stored as a single word with their other forms derived by rule.
 *
 * Two reads, issued together. Both go through the composition root to the same
 * use cases the handlers use; this page never calls its own HTTP API.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const DRILL_SIZE = 8;

export default async function VerbsPage(): Promise<ReactElement> {
  await requireUser();

  const [page, drill] = await Promise.all([
    readVerbs(PAGE_SIZE),
    readVerbDrill(DRILL_SIZE, false),
  ]);

  return (
    <>
      <header className="col-span-12 flex flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl tracking-tight text-primary-900">Verb forms</h1>
          <span className="num text-muted">
            {page.totalVerbs} verbs · {page.irregularVerbs} irregular
          </span>
        </div>
        <p className="max-w-3xl text-muted">
          Every English verb has five forms, and almost every verb mistake is one of them standing
          where another belongs — <span className="text-tertiary-700">I have went</span> instead of{' '}
          <span className="text-mastered">I have gone</span>. Learn what the five are, then the
          rest is one rule and a short list of exceptions.
        </p>
      </header>

      {/* First: what the five forms are. Nothing below means anything without it. */}
      <section className="col-span-12">
        <FormKey />
      </section>

      {/* Second: use them, before reading a thousand rows of them. */}
      <section className="col-span-12 lg:col-span-5">
        <VerbDrill coreOnly={false} initial={drill} roundSize={DRILL_SIZE} tone="light" />
      </section>

      <section className="col-span-12 lg:col-span-7">
        <h2 className="label mb-2">Which tense takes which form</h2>
        <TenseChart />
      </section>

      <section className="col-span-12">
        <h2 className="label mb-2">The list</h2>
        <VerbExplorer initialPage={page} />
      </section>

      <section className="col-span-12 lg:col-span-6">
        <h2 className="label mb-2">Spelling: -ed, -ing and -s</h2>
        <SpellingRules />
        <p className="mt-2 text-muted">
          These are the rules the list itself uses. {page.totalVerbs - page.irregularVerbs} of the
          verbs above are spelled out by them and nothing else; where a verb refuses — {' '}
          <span className="font-mono">travel → travelling</span> — the row marks the form{' '}
          <span className="text-secondary-700">irregular</span> rather than teaching a rule that
          would be wrong for <span className="font-mono">visit</span>.
        </p>
      </section>

      <section className="col-span-12 lg:col-span-6">
        <h2 className="label mb-2">Eight mistakes worth checking</h2>
        <CommonMistakes />
      </section>
    </>
  );
}
