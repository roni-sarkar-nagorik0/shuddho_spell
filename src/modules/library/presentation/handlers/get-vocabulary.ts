import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { type GetVocabularyUseCase } from '../../application/use-cases/get-vocabulary';
import { vocabularyQuerySchema, type VocabularyQuery } from '../dto/vocabulary-requests';

/** Twenty-four pairs fill a screen without turning the page into a scroll test. */
const DEFAULT_PAGE_SIZE = 24;

/**
 * `GET /api/v1/library/vocabulary` — a page of the IELTS vocabulary pairs.
 *
 * Authenticated, though nothing it returns is personal — the same line the
 * families endpoint draws, and for the same reason. The front door already
 * gives a visitor a working drill over this corpus; the corpus itself, pageable
 * and filterable, is the reference a subscriber signed in for.
 */
export function createGetVocabularyHandler(
  useCase: () => GetVocabularyUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<undefined, VocabularyQuery>(
    async ({ user, query }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      return await useCase().execute({
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
        ...(query.topic === undefined ? {} : { topic: query.topic }),
        ...(query.partOfSpeech === undefined ? {} : { partOfSpeech: query.partOfSpeech }),
        ...(query.startsWith === undefined ? {} : { startsWith: query.startsWith }),
        ...(query.after === undefined ? {} : { after: query.after }),
      });
    },
    { querySchema: vocabularyQuerySchema },
  );
}
