import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { HeatCell } from '@/components/primitives/heat-cell';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatCell } from '@/components/primitives/stat-cell';
import { StatusBadge } from '@/components/primitives/status-badge';
import { readExamResult, readPracticeQueue } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The mark, and what to do about it.
 *
 * Two variants of one page rather than two pages: the score, the by-section
 * table and the by-skill reading are identical either way, and a learner who
 * failed should not be shown a different, thinner screen — that reads as
 * punishment.
 *
 * **The fail variant carries a prescription block.** Rule 8 of
 * `08-exam-engine.md`: a failure must leave the learner with a concrete next
 * action, never just a number. The submission already wrote drills into
 * `review_items`; this names the sections that lost the marks, lists the
 * weaknesses now at the top of the practice queue, and links straight into it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExamResultPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<ReactElement> {
  const { id } = await params;
  const user = await requireUser();

  const result = await readExamResult(user.userId, id).catch(() => null);

  if (result === null) {
    // An attempt that is not yours, does not exist, or is not finished. All
    // three look the same from outside, and telling them apart would confirm
    // that an id exists.
    notFound();
  }

  const failed = result.passed === false;
  const queue = failed ? await readPracticeQueue(user.userId, undefined) : null;

  const weakestSection = [...result.sections].sort((a, b) => a.percent - b.percent)[0] ?? null;

  return (
    <>
      <header className="col-span-12 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">{result.title}</h1>
        <span className="num text-muted">attempt {result.attemptNumber}</span>
        {result.passed === null ? (
          <StatusBadge label="Ungraded" tone="neutral" />
        ) : (
          <StatusBadge label={result.passed ? 'Passed' : 'Not passed'} tone={result.passed ? 'passed' : 'failed'} />
        )}
      </header>

      <section className={`card col-span-12 ${failed ? 'card-accent' : ''} grid grid-cols-2 gap-6 p-4 md:grid-cols-4`}>
        <StatCell
          label="Your score"
          note={result.passPercent === null ? 'no pass mark' : `pass is ${String(result.passPercent)}%`}
          unit="%"
          value={Math.round(result.scorePercent)}
        />
        <StatCell
          label="Margin"
          note={result.passPercent === null ? 'ungraded exam' : failed ? 'short of the mark' : 'above the mark'}
          unit="pts"
          value={
            result.passPercent === null
              ? '—'
              : Math.round(result.scorePercent - result.passPercent)
          }
        />
        <StatCell label="Sections" value={result.sections.length} />
        <StatCell
          label="Submitted"
          note={new Date(result.submittedAt).toLocaleString()}
          value={new Date(result.submittedAt).toLocaleDateString()}
        />
      </section>

      <section className="card col-span-12 lg:col-span-7">
        <PanelHeader note="weighted into the final mark" title="By section" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr>
              <th className="label h-8 border-b border-hairline px-3">Section</th>
              <th className="label h-8 border-b border-hairline px-3 text-right">Weight</th>
              <th className="label h-8 border-b border-hairline px-3 text-right">Score</th>
              <th className="label h-8 border-b border-hairline px-3 text-right">Marks lost</th>
            </tr>
          </thead>
          <tbody>
            {result.sections.map((section) => (
              <tr className="h-8 border-b border-hairline last:border-b-0" key={section.code}>
                <td className="h-8 px-3">{section.code}</td>
                <td className="num h-8 px-3 text-right">{Math.round(section.weight * 100)}%</td>
                <td className="h-8 px-3 text-right">
                  <span className="flex items-center justify-end gap-1.5">
                    <HeatCell accuracy={section.percent / 100} label={section.code} size="sm" />
                    <span className="num">{Math.round(section.percent)}%</span>
                  </span>
                </td>
                {/*
                  Marks lost, not accuracy: a section at 60% carrying 35% of the
                  paper costs more than one at 40% carrying 15%, and the learner
                  should be looking at the first.
                */}
                <td className="num h-8 px-3 text-right">
                  {Math.round((100 - section.percent) * section.weight * 100) / 100}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <section className="card col-span-12 lg:col-span-5">
        <PanelHeader title="What this means" />
        <div className="flex flex-col gap-3 p-4">
          {result.passed === null ? (
            <p className="text-muted">
              The diagnostic is not graded. It has placed you on the programme — your dashboard has
              the day it chose.
            </p>
          ) : result.passed ? (
            <p>
              You cleared the mark
              {weakestSection === null ? '.' : ` — your weakest section was ${weakestSection.code}.`}{' '}
              Keep the reviews going; nothing here is retained by passing an exam once.
            </p>
          ) : (
            <p>
              {weakestSection === null
                ? 'The marks were spread evenly across the sections.'
                : `Most of the marks went in ${weakestSection.code}, at ${String(Math.round(weakestSection.percent))}%.`}{' '}
              That is where the retake is won.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              className="h-9 rounded-control border border-primary-900 px-3 py-2 text-primary-900"
              href={`/exams/review/${result.attemptId}`}
            >
              Review every answer
            </Link>
            <Link
              className="h-9 rounded-control border border-primary-900 px-3 py-2 text-primary-900"
              href="/exams"
            >
              Back to exams
            </Link>
          </div>
        </div>
      </section>

      {/* The prescription. Fail variant only — rule 8. */}
      {failed && queue !== null && (
        <section className="card card-accent col-span-12">
          <PanelHeader
            note={`${String(queue.items.length)} drills queued`}
            title="Your prescription"
          />
          <div className="flex flex-col gap-4 p-4">
            <p>
              Submitting a failed paper wrote drills into your review schedule, targeted at what
              actually lost the marks. This is the concrete next action — not the number above it.
            </p>

            {queue.weaknesses.length === 0 ? (
              <p className="text-muted">
                No single weakness stands out yet. Work through the queue and the pattern will
                appear.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {queue.weaknesses.slice(0, 8).map((weakness) => (
                  <li
                    className="flex items-center gap-2 rounded-card border border-hairline px-2 py-1"
                    key={weakness.dimensionId}
                  >
                    <HeatCell accuracy={weakness.accuracy} label={weakness.label} size="sm" />
                    <span className="font-mono">{weakness.label}</span>
                    <MonoValue size="sm" unit="%" value={Math.round(weakness.accuracy * 100)} />
                  </li>
                ))}
              </ul>
            )}

            <div>
              <Link
                className="h-9 rounded-control bg-primary-900 px-4 py-2 text-surface"
                href="/practice"
              >
                Start the drills
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
