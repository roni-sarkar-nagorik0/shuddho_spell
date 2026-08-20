import { PushPermissionBanner } from '@/components/notifications/push-permission-banner';
import { publicEnv } from '@/lib/env.public';
import { readLearnerDashboard } from '@/composition/reads';
import { requireUser } from '@/lib/auth/current-user';

/**
 * The dashboard, read **directly through the composition root**.
 *
 * This page never calls the app's own HTTP API, and no page here may — the
 * sweep in `src/composition/one-implementation.test.ts` enforces it, and this
 * comment is worded to avoid tripping it, exactly as F3.11 had to.
 *
 * The page and `GET /api/v1/progress/summary` run the same
 * `GetLearnerDashboard` use case. The endpoint exists for TanStack Query and
 * any future client, not as this page's data source: going over HTTP would add
 * a network hop, a serialisation round trip and a second place for the shape to
 * be wrong.
 *
 * Phase 10 builds the real shell and the components. This renders the numbers
 * the use case already returns, in the plainest possible markup, so the read
 * path is real and provable now rather than asserted and built later.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const dashboard = await readLearnerDashboard(user.userId);

  return (
    <section className="col-span-12">
      {/*
        Inline, above the content, after the page has rendered — never a modal
        on load. The key is passed down because a Client Component importing the
        env schema would pull it into the bundle; it is public either way.
      */}
      <PushPermissionBanner vapidPublicKey={publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />

      <h1 className="mt-8 text-2xl font-semibold">{dashboard.displayName}</h1>

      <dl className="mt-8 grid grid-cols-2 gap-6">
        <div>
          <dt className="text-sm">Day</dt>
          <dd className="text-xl">
            {dashboard.currentDayIndex} of {dashboard.totalDays}
          </dd>
        </div>
        <div>
          <dt className="text-sm">Streak</dt>
          <dd className="text-xl">
            {dashboard.streakIsAlive ? dashboard.currentStreak : 0}
          </dd>
        </div>
        <div>
          <dt className="text-sm">Reviews due</dt>
          <dd className="text-xl">{dashboard.dueReviewCount}</dd>
        </div>
        <div>
          <dt className="text-sm">Today</dt>
          <dd className="text-xl">{dashboard.today?.title ?? 'Nothing scheduled'}</dd>
        </div>
      </dl>
    </section>
  );
}
