import { notFound } from 'next/navigation';
import { type ReactElement } from 'react';
import { readProgramDay } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';
import { LessonRuntime } from './lesson-runtime';

/**
 * One day of the programme, in focus mode.
 *
 * The day's content is read on the server through the composition root — the
 * same `GetProgramDay` use case the endpoint runs, which is also the use case
 * that refuses a locked day. The runtime below is a Client Component because
 * the stages are interaction; the content it needs crosses as plain data.
 *
 * A day that does not resolve is a 404, not an error page: an unlocked day and
 * a nonexistent day look the same from the outside, and telling the difference
 * would confirm what exists on days the learner has not reached.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  readonly params: Promise<{ readonly day: string }>;
}): Promise<ReactElement> {
  const { day } = await params;
  const dayIndex = Number.parseInt(day, 10);

  if (!Number.isInteger(dayIndex) || dayIndex < 1) {
    notFound();
  }

  const user = await requireUser();
  const detail = await readProgramDay(user.userId, dayIndex).catch(() => null);

  if (detail === null) {
    notFound();
  }

  return (
    <LessonRuntime
      dayIndex={detail.dayIndex}
      description={detail.description}
      title={detail.title}
    />
  );
}
