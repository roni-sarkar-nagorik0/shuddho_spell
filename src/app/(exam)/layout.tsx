import { type ReactElement, type ReactNode } from 'react';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The exam runtime's shell: flat `primary-900`, and nothing else on it.
 *
 * `12-design-system.md` gives the exam runtime its own surface — no ruled
 * paper, no rail, no top bar, no notification bell. That is not decoration: it
 * is the same idea as an invigilated room. There is nothing to click that is
 * not the paper, and nothing that arrives unbidden while the clock runs.
 *
 * A separate route group rather than a variant of `(learn)`, so no future panel
 * added to the learner shell can leak into an exam by accident.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExamLayout({
  children,
}: {
  readonly children: ReactNode;
}): Promise<ReactElement> {
  await requireUser();

  return <div className="min-h-screen bg-primary-900 text-surface">{children}</div>;
}
