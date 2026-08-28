import { type NextRequest, type NextResponse } from 'next/server';
import { withApi } from '@/lib/api/with-api';
import { type GetVocabularyDrillUseCase } from '../../application/use-cases/get-vocabulary-drill';
import { vocabularyDrillQuerySchema, type VocabularyDrillQuery } from '../dto/vocabulary-requests';

/** Six questions — long enough to show the idea, short enough to finish. */
const DEFAULT_COUNT = 6;

/**
 * `GET /api/v1/demo/vocabulary` — a fresh set of drill questions.
 *
 * **Public, and deliberately so**, on the same terms as `/api/v1/demo/word`:
 * the demo's promise is "no account needed", and a try-before-you-sign-up
 * behind a session is not one.
 *
 * It does **not** publish the corpus. Six questions per request, chosen
 * server-side, with no cursor, no filter and no topic parameter — an endpoint
 * that let a caller page through 777 pairs would be handing out the reference
 * to anybody who found the URL, which is a different thing from a demo. The
 * pageable version of exactly this data is behind `/api/v1/library/vocabulary`
 * and requires a session.
 *
 * Rate-limited by address, because it is anonymous. It costs no query — the
 * corpus is a compiled module — so the limit is about the same caller
 * harvesting the corpus a handful of entries at a time, not about load.
 */
export function createGetVocabularyDrillHandler(
  useCase: () => GetVocabularyDrillUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<undefined, VocabularyDrillQuery>(
    async ({ query }) => useCase().execute({ count: query.count ?? DEFAULT_COUNT }),
    {
      auth: 'public',
      querySchema: vocabularyDrillQuerySchema,
      rateLimit: { key: 'demo:vocabulary', limit: 60, windowSeconds: 60 },
    },
  );
}
