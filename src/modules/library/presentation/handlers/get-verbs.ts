import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { type GetVerbsUseCase } from '../../application/use-cases/get-verbs';
import { verbQuerySchema, type VerbQuery } from '../dto/verb-requests';

/** Fifty rows — a verb table is scanned down a column, not read across. */
const DEFAULT_PAGE_SIZE = 50;

/**
 * `GET /api/v1/library/verbs` — a page of the verb reference, all five forms.
 *
 * Authenticated, on the same terms as the families and the vocabulary: nothing
 * it returns is personal, and signing in is the line rather than privacy. The
 * front door already gives a visitor a working drill over the same corpus.
 */
export function createGetVerbsHandler(
  useCase: () => GetVerbsUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<undefined, VerbQuery>(
    async ({ user, query }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      return await useCase().execute({
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
        ...(query.letters === undefined ? {} : { letters: query.letters }),
        ...(query.group === undefined ? {} : { group: query.group }),
        ...(query.startsWith === undefined ? {} : { startsWith: query.startsWith }),
        ...(query.after === undefined ? {} : { after: query.after }),
      });
    },
    { querySchema: verbQuerySchema },
  );
}
