import 'server-only';
import { createGetMeHandler } from '@/modules/auth/presentation/handlers/get-me';
import { createAdvanceStageHandler } from '@/modules/lessons/presentation/handlers/advance-stage';
import { createStartSessionHandler } from '@/modules/lessons/presentation/handlers/start-session';
import { createSubmitAttemptHandler } from '@/modules/lessons/presentation/handlers/submit-attempt';
import { createGetProgramDayHandler } from '@/modules/program/presentation/handlers/get-program-day';
import { createGetProgramHandler } from '@/modules/program/presentation/handlers/get-program';
import { createGetDueHandler } from '@/modules/review/presentation/handlers/get-due';
import { createSubmitReviewAttemptHandler } from '@/modules/review/presentation/handlers/submit-review-attempt';
import { createContainer } from './container';
import {
  makeAdvanceLessonStage,
  makeGetDueReviewItems,
  makeGetMe,
  makeGetProgramDay,
  makeGetProgramOverview,
  makeStartLessonSession,
  makeSubmitConstructionAttempt,
  makeSubmitDictationAttempt,
  makeSubmitReviewAttempt,
} from './use-cases';

/**
 * Where a route handler is joined to its dependencies.
 *
 * `src/app` may import this and `presentation` may not, which is the whole
 * reason it exists: a handler factory takes the use case it needs, and this is
 * the one file allowed to know where that comes from. It keeps `route.ts` a
 * three-line re-export, which `01-architecture.md` asks for.
 *
 * The container is built **per call**, not once at module load. A container
 * holds a request-scoped client, and one captured at import time would outlive
 * the request that justified it — the reason every line below is a closure
 * rather than a value.
 */
function container(): ReturnType<typeof createContainer> {
  return createContainer(crypto.randomUUID());
}

export const getMeHandler = createGetMeHandler(() => makeGetMe(container()));

export const getProgramHandler = createGetProgramHandler(() =>
  makeGetProgramOverview(container()),
);

export const getProgramDayHandler = createGetProgramDayHandler(() =>
  makeGetProgramDay(container()),
);

export const startLessonSessionHandler = createStartSessionHandler(() =>
  makeStartLessonSession(container()),
);

export const advanceLessonStageHandler = createAdvanceStageHandler(() =>
  makeAdvanceLessonStage(container()),
);

export const submitLessonAttemptHandler = createSubmitAttemptHandler(() => {
  // One container for both, so the two use cases in this request share a
  // database handle rather than opening two.
  const c = container();

  return {
    dictation: makeSubmitDictationAttempt(c),
    construction: makeSubmitConstructionAttempt(c),
  };
});

export const getDueReviewHandler = createGetDueHandler(() => makeGetDueReviewItems(container()));

export const submitReviewAttemptHandler = createSubmitReviewAttemptHandler(() =>
  makeSubmitReviewAttempt(container()),
);
