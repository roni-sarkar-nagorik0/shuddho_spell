import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { readGrammarLesson } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { Checks } from './checks';

/**
 * One day of the grammar course.
 *
 * A reading screen, and Server Components all the way down except the answers
 * at the bottom. There is nothing to fetch, nothing to submit and no state to
 * hold, so shipping this as a client bundle would buy the learner a slower
 * first paint in exchange for nothing at all.
 *
 * The day comes from the URL, which is untrusted: `/grammar/99` and
 * `/grammar/../etc` both arrive here as strings. The use case answers `null`
 * for anything that is not a day, and this renders Next's 404 for it rather
 * than an empty page that looks like a bug.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEVEL_LABELS: Readonly<Record<string, string>> = {
  basic: 'Basic',
  building: 'Building',
  strong: 'Strong',
  advanced: 'Advanced',
};

export default async function GrammarDayPage({
  params,
}: {
  readonly params: Promise<{ readonly day: string }>;
}): Promise<ReactElement> {
  const [, resolved] = await Promise.all([requireUser(), params]);
  const parsed = Number.parseInt(resolved.day, 10);
  const lesson = await readGrammarLesson(Number.isFinite(parsed) ? parsed : 0);

  if (lesson === null) {
    notFound();
  }

  return (
    <>
      <header className="col-span-12 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <Link className="text-muted underline" href="/grammar">
            Grammar
          </Link>
          <span className="label">
            Day {lesson.dayIndex} of 28 · week {lesson.weekIndex} ·{' '}
            {LEVEL_LABELS[lesson.level] ?? lesson.level}
          </span>
          <span className="ml-auto flex items-baseline gap-1.5">
            <MonoValue size="sm" value={lesson.minutes} />
            <span className="text-muted">min</span>
          </span>
        </div>

        <h1 className="font-display text-2xl tracking-tight text-primary-900">{lesson.title}</h1>
        <p className="font-bengali text-lg text-muted" lang="bn">
          {lesson.banglaTitle}
        </p>
        <p className="max-w-2xl text-primary-900">{lesson.goal}</p>
      </header>

      <section className="col-span-12 rounded-control border border-hairline bg-surface p-4">
        <h2 className="label">Why this matters in IELTS</h2>
        <p className="mt-1 max-w-3xl text-neutral-700">{lesson.ieltsWhy}</p>
      </section>

      {lesson.sections.map((section) => (
        <section className="col-span-12 flex flex-col gap-3" key={section.heading}>
          <h2 className="border-b border-hairline pb-1 font-display text-lg tracking-tight text-primary-900">
            {section.heading}
          </h2>

          <p className="max-w-3xl text-neutral-700">{section.plain}</p>

          <p className="max-w-3xl font-bengali text-primary-900" lang="bn">
            {section.bangla}
          </p>

          <ul className="flex flex-col gap-1.5">
            {section.examples.map((example) => (
              <li className="flex flex-wrap items-baseline gap-x-3" key={example.english}>
                <span className="text-primary-900">{example.english}</span>
                {example.note !== null && <span className="text-muted">— {example.note}</span>}
              </li>
            ))}
          </ul>

          {section.table !== null && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="label pb-1 text-left">{section.table.caption}</caption>
                <thead>
                  <tr>
                    {section.table.headers.map((header) => (
                      <th
                        className="border-b border-hairline py-1.5 pr-4 font-medium text-primary-900"
                        key={header}
                        scope="col"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row) => (
                    <tr key={row.join('|')}>
                      {row.map((cell) => (
                        <td className="border-b border-hairline py-1.5 pr-4 text-neutral-700" key={cell}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <section className="col-span-12 flex flex-col gap-3">
        <h2 className="border-b border-hairline pb-1 font-display text-lg tracking-tight text-primary-900">
          Mistakes to stop making
        </h2>

        <ul className="flex flex-col gap-3">
          {lesson.mistakes.map((mistake) => (
            <li className="rounded-control border border-hairline bg-surface p-3" key={mistake.wrong}>
              <p className="text-tertiary-700">
                <span aria-hidden="true">✗ </span>
                <span className="sr-only">Wrong: </span>
                {mistake.wrong}
              </p>
              <p className="text-primary-900">
                <span aria-hidden="true">✓ </span>
                <span className="sr-only">Right: </span>
                {mistake.right}
              </p>
              <p className="mt-1 text-muted">{mistake.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="col-span-12 flex flex-col gap-3">
        <h2 className="border-b border-hairline pb-1 font-display text-lg tracking-tight text-primary-900">
          Take these into the exam
        </h2>

        <ul className="flex flex-col gap-1.5">
          {lesson.ieltsMoves.map((move) => (
            <li className="text-primary-900" key={move}>
              {move}
            </li>
          ))}
        </ul>
      </section>

      <section className="col-span-12 flex flex-col gap-3">
        <h2 className="border-b border-hairline pb-1 font-display text-lg tracking-tight text-primary-900">
          Check yourself
        </h2>

        <Checks items={lesson.checks} />
      </section>

      <nav
        aria-label="Move between days"
        className="col-span-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3"
      >
        {lesson.previous === null ? (
          <span className="text-muted">This is the first day.</span>
        ) : (
          <Link
            className="flex h-9 items-center rounded-control border border-hairline bg-surface px-3 text-neutral-700 hover:bg-primary-50"
            href={`/grammar/${String(lesson.previous.dayIndex)}`}
          >
            ← Day {lesson.previous.dayIndex}: {lesson.previous.title}
          </Link>
        )}

        {lesson.next === null ? (
          <span className="text-muted">That is the whole course.</span>
        ) : (
          <Link
            className="flex h-9 items-center rounded-control bg-primary-900 px-3 text-surface"
            href={`/grammar/${String(lesson.next.dayIndex)}`}
          >
            Day {lesson.next.dayIndex}: {lesson.next.title} →
          </Link>
        )}
      </nav>
    </>
  );
}
