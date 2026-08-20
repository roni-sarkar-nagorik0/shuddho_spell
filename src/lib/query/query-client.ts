import { QueryClient } from '@tanstack/react-query';
import { NEVER_RETRY, retryReads } from './retry-policy';

/** Long enough that moving between screens does not refetch; short enough to feel live. */
const STALE_TIME_MS = 30_000;

/**
 * One client per browser tab, created by the provider rather than at module
 * scope.
 *
 * A module-scope client would be shared across requests on the server, which
 * means one learner's cache serving another learner's render — the classic
 * Next.js cache-leak, and the reason this is a factory and not a singleton.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: retryReads,
        staleTime: STALE_TIME_MS,
        // The tab regaining focus is not evidence the data changed, and a
        // refetch on every alt-tab is a request storm on a dense dashboard.
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: NEVER_RETRY,
      },
    },
  });
}
