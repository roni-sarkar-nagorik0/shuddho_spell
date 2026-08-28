import { type NextRequest, type NextResponse } from 'next/server';
import { withApi } from '@/lib/api/with-api';
import { type GetVerbDrillUseCase } from '../../application/use-cases/get-verb-drill';
import { verbDrillQuerySchema, type VerbDrillQuery } from '../dto/verb-requests';

/** Six questions — long enough to show the idea, short enough to finish. */
const DEFAULT_COUNT = 6;

/**
 * `GET /api/v1/demo/verbs` — a fresh set of verb-form questions.
 *
 * **Public**, on the same terms as `/api/v1/demo/word` and
 * `/api/v1/demo/vocabulary`: the panel promises "no account needed", it writes
 * nothing, and it hands out six questions rather than a page. An endpoint that
 * let a caller walk the corpus would be publishing the reference to anybody who
 * found the URL; the pageable version is `/api/v1/library/verbs` and needs a
 * session.
 *
 * Rate-limited by address, because it is anonymous. It costs no query — the
 * corpus is a compiled module — so the limit is about a caller harvesting six
 * verbs at a time rather than about load.
 */
export function createGetVerbDrillHandler(
  useCase: () => GetVerbDrillUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<undefined, VerbDrillQuery>(
    async ({ query }) =>
      useCase().execute({
        count: query.count ?? DEFAULT_COUNT,
        ...(query.core === undefined ? {} : { coreOnly: query.core === 'true' }),
      }),
    {
      auth: 'public',
      querySchema: verbDrillQuerySchema,
      rateLimit: { key: 'demo:verbs', limit: 60, windowSeconds: 60 },
    },
  );
}
