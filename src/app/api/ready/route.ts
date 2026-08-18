import { createSessionClient } from '@/lib/supabase/session-client';
import { withApi } from '@/lib/api/with-api';

/** Readiness means the database answers, not merely that the process is up. */
export const GET = withApi(
  async () => {
    const supabase = await createSessionClient();
    const { error } = await supabase.from('health_probe').select('id').limit(1);
    const database = error === null || error.code === 'PGRST205' ? 'up' : 'down';
    return { status: database === 'up' ? ('ready' as const) : ('degraded' as const), database };
  },
  { auth: false },
);
