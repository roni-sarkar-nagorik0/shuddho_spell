import { type ReactElement } from 'react';
import { requireUser } from '@/lib/auth/current-user';
import { ExamRuntime } from './exam-runtime';

/**
 * The exam runtime's route.
 *
 * Deliberately thin, and deliberately **not** a server read of the attempt. The
 * runtime resumes from `GET /api/v1/exams/attempts/active`, which returns the
 * remaining seconds computed from the server clock at the moment of the
 * request — rendering the paper on the server would bake a `remainingSeconds`
 * into the HTML, and a page served from any cache would hand the learner a
 * stale clock.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExamAttemptPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<ReactElement> {
  const { id } = await params;
  await requireUser();

  return <ExamRuntime attemptId={id} />;
}
