import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { PanelHeader } from '@/components/primitives/panel-header';
import { StatusBadge, type StatusTone } from '@/components/primitives/status-badge';
import { readExamCatalogue } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The exam catalogue.
 *
 * **Every lock and every readiness figure on this page is the server's.** They
 * come from `GetExamCatalogue`, which runs the same `ExamEligibilityPolicy`
 * that `StartExamAttempt` consults — so a disabled button and a 409 cannot
 * disagree, and a learner who ignores the button is refused anyway. Nothing
 * here is recomputed in the browser, and there is no client state to drift.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

function hoursAndMinutes(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds / 60));
  const hours = Math.floor(total / 60);

  return hours === 0 ? `${String(total)}m` : `${String(hours)}h ${String(total % 60)}m`;
}

interface ILockView {
  readonly tone: StatusTone;
  readonly label: string;
  readonly detail: string;
}

function describeLock(lock: {
  readonly kind: string;
  readonly daysAway?: number;
  readonly unlockDayIndex?: number;
  readonly remainingSeconds?: number;
  readonly maxAttempts?: number;
  readonly used?: number;
}): ILockView {
  switch (lock.kind) {
    case 'open':
      return { tone: 'due', label: 'Open', detail: 'You can sit this now.' };
    case 'not_reached':
      return {
        tone: 'locked',
        label: 'Locked',
        detail: `Unlocks on day ${String(lock.unlockDayIndex ?? 0)} — ${String(lock.daysAway ?? 0)} to go.`,
      };
    case 'cooling_down':
      return {
        tone: 'locked',
        label: 'Cooling down',
        detail: `Retake in ${hoursAndMinutes(lock.remainingSeconds ?? 0)}.`,
      };
    default:
      return {
        tone: 'failed',
        label: 'No attempts left',
        detail: `You have used all ${String(lock.maxAttempts ?? 0)} attempts.`,
      };
  }
}

export default async function ExamsPage(): Promise<ReactElement> {
  const user = await requireUser();
  const catalogue = await readExamCatalogue(user.userId);

  return (
    <>
      <header className="col-span-12 flex items-baseline gap-3">
        <h1 className="font-display text-xl tracking-tight text-primary-900">Exams</h1>
        <span className="num text-muted">day {catalogue.currentDayIndex}</span>
      </header>

      {catalogue.exams.map((exam) => {
        const lock = describeLock(exam.lock);

        return (
          <section className="card col-span-12 lg:col-span-6" key={exam.code}>
            <PanelHeader
              action={
                exam.hasPassed ? (
                  <StatusBadge label="Passed" tone="passed" />
                ) : (
                  <StatusBadge label={lock.label} tone={lock.tone} />
                )
              }
              note={`day ${String(exam.unlockDayIndex)}`}
              title={exam.title}
            />

            <div className="flex flex-col gap-4 p-4">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="label">Duration</dt>
                  <dd>
                    <MonoValue size="sm" unit="min" value={minutes(exam.durationSeconds)} />
                  </dd>
                </div>
                <div>
                  <dt className="label">Questions</dt>
                  <dd>
                    <MonoValue size="sm" value={exam.questionCount} />
                  </dd>
                </div>
                <div>
                  <dt className="label">Pass mark</dt>
                  <dd>
                    {exam.passPercent === null ? (
                      <span className="text-muted">ungraded</span>
                    ) : (
                      <MonoValue size="sm" unit="%" value={exam.passPercent} />
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="label">Attempts</dt>
                  <dd>
                    <MonoValue
                      size="sm"
                      value={
                        exam.maxAttempts === null
                          ? String(exam.attemptsUsed)
                          : `${String(exam.attemptsUsed)}/${String(exam.maxAttempts)}`
                      }
                    />
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                {exam.predictedScorePercent === null ? (
                  <span className="text-muted">
                    Readiness is predicted once the exam unlocks — there is little to predict from
                    before that.
                  </span>
                ) : (
                  <>
                    <span className="label">Predicted</span>
                    <MonoValue unit="%" value={Math.round(exam.predictedScorePercent)} />
                    <StatusBadge
                      label={exam.likelyToPass === true ? 'Likely pass' : 'Not ready yet'}
                      tone={exam.likelyToPass === true ? 'passed' : 'failed'}
                    />
                  </>
                )}
                {exam.bestScorePercent !== null && (
                  <span className="num text-muted">
                    best {Math.round(exam.bestScorePercent)}%
                  </span>
                )}
              </div>

              <p className="text-muted">{lock.detail}</p>

              <div className="flex flex-wrap gap-2">
                {exam.activeAttemptId === null ? (
                  <Link
                    aria-disabled={exam.lock.kind !== 'open'}
                    className={
                      exam.lock.kind === 'open'
                        ? 'h-9 rounded-control bg-primary-900 px-4 py-2 text-surface'
                        : 'pointer-events-none h-9 rounded-control bg-neutral-100 px-4 py-2 text-cold'
                    }
                    href={exam.lock.kind === 'open' ? `/exams/${exam.code}` : '/exams'}
                    tabIndex={exam.lock.kind === 'open' ? undefined : -1}
                  >
                    Open the lobby
                  </Link>
                ) : (
                  /*
                    An attempt already running always wins. Offering "start"
                    beside a live attempt is how a learner loses a paper.
                  */
                  <Link
                    className="h-9 rounded-control bg-tertiary-500 px-4 py-2 text-surface"
                    href={`/exams/attempt/${exam.activeAttemptId}`}
                  >
                    Resume your attempt
                  </Link>
                )}

                {exam.hasPassed && (
                  <Link
                    className="h-9 rounded-control border border-primary-900 px-4 py-2 text-primary-900"
                    href="/progress"
                  >
                    See your record
                  </Link>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
