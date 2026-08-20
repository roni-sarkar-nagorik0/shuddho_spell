import { PreferencesTable } from '@/components/notifications/preferences-table';
import { PushPermissionBanner } from '@/components/notifications/push-permission-banner';
import { publicEnv } from '@/lib/env.public';
import { requireUser } from '@/lib/auth/current-user';

/**
 * Notification settings.
 *
 * Two channels and a permission banner. Phase 10 builds the shell this sits
 * inside; the markup here is plain on purpose so the behaviour is real and
 * provable now rather than asserted now and built later.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  await requireUser();

  return (
    <section className="col-span-12">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      <div className="mt-6">
        <PushPermissionBanner vapidPublicKey={publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </div>

      <div className="mt-8">
        <PreferencesTable />
      </div>
    </section>
  );
}
