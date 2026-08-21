import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { type GetWordFamiliesUseCase } from '../../application/use-cases/get-word-families';
import { wordFamilyQuerySchema, type WordFamilyQuery } from '../dto/word-family-requests';

/** Twelve cards fill a screen without the page becoming a scroll test. */
const DEFAULT_PAGE_SIZE = 12;

/**
 * `GET /api/v1/library/families` — a page of the IELTS word families.
 *
 * Authenticated, though nothing it returns is personal. The families are the
 * course's own content, and the front door already gives a visitor a working
 * demonstration of what the product does; this is the reference a subscriber
 * paid for. Signing in is the line, not privacy.
 */
export function createGetWordFamiliesHandler(
  useCase: () => GetWordFamiliesUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<undefined, WordFamilyQuery>(
    async ({ user, query }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      return await useCase().execute({
        pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
        ...(query.skill === undefined ? {} : { skill: query.skill }),
        ...(query.topic === undefined ? {} : { topic: query.topic }),
        ...(query.ruleFamily === undefined ? {} : { ruleFamily: query.ruleFamily }),
        ...(query.startsWith === undefined ? {} : { startsWith: query.startsWith }),
        ...(query.after === undefined ? {} : { after: query.after }),
      });
    },
    { querySchema: wordFamilyQuerySchema },
  );
}
