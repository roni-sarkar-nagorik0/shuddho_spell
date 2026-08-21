import Link from 'next/link';
import { type ReactElement } from 'react';
import { MonoValue } from '@/components/primitives/mono-value';
import { readGrammarSyllabus } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The grammar course, all 28 days on one screen.
 *
 * A syllabus rather than a "next day" button: a learner deciding whether this
 * course is worth their time needs to see that it ends somewhere, and a learner
 * who already knows the present perfect needs to be able to skip to day 16.
 * Everything here is a link, and nothing tracks or gates — day 28 is reachable
 * on the first visit.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEVEL_LABELS: Readonly<Record<string, string>> = {
  basic: 'Basic — the machine of the sentence',
  building: 'Building — every tense you need',
  strong: 'Strong — the structures IELTS rewards',
  advanced: 'Advanced — band 7 polish',
};

function hours(minutes: number): string {
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${String(whole)}h` : `${String(whole)}h ${String(rest)}m`;
}

export default async function GrammarPage(): Promise<ReactElement> {
  await requireUser();
  const syllabus = await readGrammarSyllabus();

  return (
    <>
      <header className="col-span-12 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-xl tracking-tight text-primary-900">Grammar for IELTS</h1>
          <span className="flex items-baseline gap-1.5">
            <MonoValue size="sm" value={syllabus.totalDays} />
            <span className="text-muted">days</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-muted">about</span>
            <MonoValue size="sm" value={hours(syllabus.totalMinutes)} />
            <span className="text-muted">in total</span>
          </span>
        </div>
        <p className="max-w-2xl text-muted">
          Only the grammar the exam actually asks for, explained from the beginning. Start at day 1
          if you are unsure — each day assumes the ones before it, and nothing here is locked.
        </p>
      </header>

      {syllabus.weeks.map((week) => (
        <section className="col-span-12 flex flex-col gap-2" key={week.weekIndex}>
          <div className="flex flex-wrap items-baseline gap-3 border-b border-hairline pb-1">
            <h2 className="font-display text-base tracking-tight text-primary-900">
              Week {week.weekIndex}
            </h2>
            <span className="label">{LEVEL_LABELS[week.level] ?? week.level}</span>
            <span className="ml-auto flex items-baseline gap-1.5">
              <MonoValue size="sm" value={week.minutes} />
              <span className="text-muted">min</span>
            </span>
          </div>

          <ul className="flex flex-col">
            {week.days.map((day) => (
              <li key={day.dayIndex}>
                <Link
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-control px-2 py-2 hover:bg-primary-50"
                  href={`/grammar/${String(day.dayIndex)}`}
                >
                  <MonoValue className="w-6 shrink-0 text-muted" size="sm" value={day.dayIndex} />
                  <span className="font-medium text-primary-900">{day.title}</span>
                  <span className="font-bengali text-muted" lang="bn">
                    {day.banglaTitle}
                  </span>
                  <span className="ml-auto flex items-baseline gap-1.5">
                    <MonoValue size="sm" value={day.minutes} />
                    <span className="text-muted">min</span>
                  </span>
                  <span className="w-full text-muted">{day.goal}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
