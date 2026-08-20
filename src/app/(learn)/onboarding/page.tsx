import { type ReactElement } from 'react';
import { requireUser } from '@/lib/auth/current-user';
import { OnboardingWizard } from './onboarding-wizard';

/**
 * Onboarding: goal, minutes, track, reminder, diagnostic.
 *
 * Inside `(learn)` because it needs a signed-in learner — there is a profile to
 * write to and no anonymous version of this. The wizard reads the stored state
 * itself so that "resumable" means resumable from any device, not just from the
 * `localStorage` of the browser that started it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function OnboardingPage(): Promise<ReactElement> {
  await requireUser();

  return (
    <section className="col-span-12 lg:col-span-8">
      <h1 className="font-display text-xl tracking-tight text-primary-900">Set up your course</h1>
      <p className="mt-1 text-muted">
        Five questions. You can leave at any point and pick up where you stopped.
      </p>

      <div className="mt-8">
        <OnboardingWizard />
      </div>
    </section>
  );
}
