import { withApi } from '@/lib/api/with-api';

export const GET = withApi(() => Promise.resolve({ status: 'ok' as const }), { auth: 'public' });
