import { notFound } from 'next/navigation';
import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatusBadge } from '@/components/primitives/status-badge';
import { readExamCatalogue } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { BeginPanel } from './begin-panel';

/**
 * The lobby: the specification, the sections, the rules, the system check and
 * the begin button.
 *
 * The exam is read from the catalogue rather than from a lobby-specific use
 * case, so the lock the learner saw on `/exams` is the identical value here —
 * one evaluation, two screens, nothing to disagree about.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RULES: readonly string[] = [
  'The clock is the server’s. Closing the tab does not pause it and reopening does not extend it.',
  'Sections are sat in order and cannot be reopened once submitted.',
  'Answers save as you go — a refresh, a flat battery or a lost connection loses nothing.',
  'Nothing is marked in your browser, so nothing about the answer key is in it either.',
  'If the deadline passes while you are working, what is already saved is what is marked.',
];

export default async function ExamLobbyPage({
  params,
}: {
  readonly params: Promise<{ readonly code: string }>;
}): Promise<ReactElement> {
  const { code } = await params;
  const user = await requireUser();
  const catalogue = await readExamCatalogue(user.userId);
  const exam = catalogue.exams.find((entry) => entry.code === code);

  if (exam === undefined) {
    notFound();
  }

  return (
    <>
      <header className="col-span-12 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">{exam.title}</h1>
        <span className="num text-muted">day {exam.unlockDayIndex}</span>
        {exam.hasPassed && <StatusBadge label="Already passed" tone="passed" />}
      </header>

      <section className="card col-span-12 lg:col-span-7">
        <PanelHeader title="Specification" />
        <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
          <div>
            <dt className="label">Duration</dt>
            <dd>
              <MonoValue unit="min" value={Math.round(exam.durationSeconds / 60)} />
            </dd>
          </div>
          <div>
            <dt className="label">Questions</dt>
            <dd>
              <MonoValue value={exam.questionCount} />
            </dd>
          </div>
          <div>
            <dt className="label">Pass mark</dt>
            <dd>
              {exam.passPercent === null ? (
                <span className="text-muted">ungraded</span>
              ) : (
                <MonoValue unit="%" value={exam.passPercent} />
              )}
            </dd>
          </div>
          <div>
            <dt className="label">Attempts used</dt>
            <dd>
              <MonoValue
                value={
                  exam.maxAttempts === null
                    ? String(exam.attemptsUsed)
                    : `${String(exam.attemptsUsed)}/${String(exam.maxAttempts)}`
                }
              />
            </dd>
          </div>
          <div>
            <dt className="label">Cooldown</dt>
            <dd>
              {exam.cooldownHours === null ? (
                <span className="text-muted">none</span>
              ) : (
                <MonoValue unit="h" value={exam.cooldownHours} />
              )}
            </dd>
          </div>
          <div>
            <dt className="label">Predicted</dt>
            <dd>
              {exam.predictedScorePercent === null ? (
                <span className="text-muted">not yet</span>
              ) : (
                <MonoValue unit="%" value={Math.round(exam.predictedScorePercent)} />
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card col-span-12 lg:col-span-5">
        <PanelHeader note="weights are fixed" title="Sections" />
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="label h-8 border-b border-hairline px-3">Section</th>
              <th className="label h-8 border-b border-hairline px-3 text-right">Questions</th>
              <th className="label h-8 border-b border-hairline px-3 text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {exam.sections.map((section) => (
              <tr className="h-8 border-b border-hairline last:border-b-0" key={section.code}>
                <td className="h-8 px-3">{section.code}</td>
                <td className="num h-8 px-3 text-right">{section.questionCount}</td>
                <td className="num h-8 px-3 text-right">{Math.round(section.weight * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card col-span-12 lg:col-span-7">
        <PanelHeader title="Before you begin" />
        <div className="p-4">
          <BeginPanel
            code={exam.code}
            durationMinutes={Math.round(exam.durationSeconds / 60)}
            questionCount={exam.questionCount}
            serverAllowsStart={exam.lock.kind === 'open' && exam.activeAttemptId === null}
          />

          {exam.activeAttemptId !== null && (
            <p className="mt-4">
              <Link
                className="text-primary-900 underline"
                href={`/exams/attempt/${exam.activeAttemptId}`}
              >
                You already have an attempt running — resume it instead.
              </Link>
            </p>
          )}
        </div>
      </section>

      <section className="card col-span-12 lg:col-span-5">
        <PanelHeader title="Rules" />
        <ul className="flex flex-col">
          {RULES.map((rule) => (
            <li className="border-b border-hairline px-3 py-2 last:border-b-0" key={rule}>
              {rule}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
