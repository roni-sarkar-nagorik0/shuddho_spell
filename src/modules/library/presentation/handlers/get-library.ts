import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type GetLibraryPageUseCase } from '../../application/use-cases/get-library-page';
import { libraryQuerySchema, type LibraryQuery } from '../dto/library-requests';

/** A screenful of a 32px-row table without scrolling twice. */
const DEFAULT_PAGE_SIZE = 25;

/**
 * `GET /api/v1/library` — a keyset page of the word list.
 *
 * The page is per learner (it carries their own accuracy on every row), so it
 * is authenticated by omission, like every other read here.
 */
export function createGetLibraryHandler(
  useCase: () => GetLibraryPageUseCase,
): (request: NextRequest) => Promise<NextResponse> {
  return withApi<undefined, LibraryQuery>(
    async ({ user, query }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({
          userId: user.userId,
          pageSize: query.pageSize ?? DEFAULT_PAGE_SIZE,
          ...(query.after === undefined ? {} : { after: query.after }),
          ...(query.contains === undefined ? {} : { contains: query.contains }),
          ...(query.weekIndex === undefined ? {} : { weekIndex: query.weekIndex }),
          ...(query.partOfSpeech === undefined ? {} : { partOfSpeech: query.partOfSpeech }),
          ...(query.ruleFamilyId === undefined ? {} : { ruleFamilyId: query.ruleFamilyId }),
        });
      } catch (caught: unknown) {
        if (caught instanceof ProfileNotFoundError) {
          throw ApiError.notFound('Your learner profile');
        }
        throw caught;
      }
    },
    { querySchema: libraryQuerySchema },
  );
}
