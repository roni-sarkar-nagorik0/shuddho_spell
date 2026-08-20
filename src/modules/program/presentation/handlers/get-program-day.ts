import { type NextRequest, type NextResponse } from 'next/server';
import { ApiError } from '@/lib/api/problem';
import { withApi, type IRouteContext } from '@/lib/api/with-api';
import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type GetProgramDayUseCase } from '../../application/use-cases/get-program-day';
import { DayLockedError } from '../../domain/errors/day-locked.error';
import { DayNotFoundError } from '../../domain/errors/day-not-found.error';
import { programDayParamsSchema, type IProgramDayParams } from '../dto/program-params';

/**
 * `GET /api/v1/program/days/:dayIndex`.
 *
 * The three failures map to three different statuses, and the differences are
 * the point: a locked day is **403** because the learner exists and may not
 * have it yet, a missing day is **404** because the content is not there, and
 * a missing profile is 404 for the profile. Collapsing them into one status
 * would make the client unable to tell "come back later" from "this is broken".
 */
export function createGetProgramDayHandler(
  useCase: () => GetProgramDayUseCase,
): (request: NextRequest, context?: IRouteContext) => Promise<NextResponse> {
  return withApi<undefined, undefined, IProgramDayParams>(
    async ({ user, params }) => {
      if (user === null) {
        throw ApiError.unauthenticated();
      }

      try {
        return await useCase().execute({ userId: user.userId, dayIndex: params.dayIndex });
      } catch (caught: unknown) {
        if (caught instanceof DayLockedError) {
          throw ApiError.forbidden();
        }
        if (caught instanceof DayNotFoundError) {
          throw ApiError.notFound('That day');
        }
        if (caught instanceof ProfileNotFoundError) {
          throw ApiError.notFound('Your learner profile');
        }
        throw caught;
      }
    },
    { paramsSchema: programDayParamsSchema },
  );
}
