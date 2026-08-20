import 'server-only';
import { cache } from 'react';
import { type IExamMilestone } from '@/modules/exams/application/dto/exam-milestone';
import { type INextExam } from '@/modules/exams/application/dto/next-exam';
import { type IWordPhonemeStrip } from '@/modules/library/application/dto/phoneme-strip';
import { type IProgramDayDetail } from '@/modules/program/application/dto/program-day-detail';
import { type IProgramOverview } from '@/modules/program/application/dto/program-overview';
import { type ILearnerDashboard } from '@/modules/progress/application/dto/learner-dashboard';
import { type IMasterySnapshot } from '@/modules/progress/application/dto/mastery-snapshot';
import { type IProgressSummary } from '@/modules/progress/application/dto/progress-summary';
import { type IWeeklyActivity } from '@/modules/progress/application/dto/weekly-activity';
import { type IDueReviewQueue } from '@/modules/review/application/dto/due-review-item';
import { createContainer } from './container';
import {
  makeGetDueReviewItems,
  makeGetLearnerDashboard,
  makeGetMasterySnapshot,
  makeGetNextExam,
  makeGetProgramDay,
  makeGetProgramOverview,
  makeGetProgressSummary,
  makeGetPhonemeStrips,
  makeGetWeeklyActivity,
  makeListExamMilestones,
} from './use-cases';

/**
 * The read path for Server Components.
 *
 * `11-api-surface.md`: "a read screen does **not** fetch its own API over HTTP.
 * A Server Component calls the same use case through the composition root — no
 * network hop, no serialisation, no double validation."
 *
 * These functions are the composition root's front door for a page, and they
 * call **exactly the same factories** `src/composition/handlers.ts` calls. That
 * is the whole point: not two implementations that agree today, one
 * implementation with two callers. A page and its endpoint cannot drift,
 * because there is nothing for them to drift apart *from*.
 *
 * `src/app` may import this. `presentation` may not, and does not need to.
 *
 * Wrapped in React's `cache` (F10.1): the shell's top bar needs the streak and
 * the dashboard page needs everything, and both are rendered inside one
 * request. Without this the layout and the page would each run the use case
 * and each hit the database for the same rows. `cache` is per-request — it is
 * request memoisation, not a cache with a lifetime, so no learner ever sees
 * another learner's numbers.
 */
export const readLearnerDashboard = cache(
  async (userId: string): Promise<ILearnerDashboard> =>
    makeGetLearnerDashboard(createContainer(crypto.randomUUID())).execute({ userId }),
);

export async function readProgressSummary(userId: string): Promise<IProgressSummary> {
  return makeGetProgressSummary(createContainer(crypto.randomUUID())).execute({ userId });
}

/**
 * The rest of the read path, added by Phase 11 as each screen needed it.
 *
 * All memoised per request for the same reason as the dashboard: the shell's
 * layout, the page and any panel that shares a source run inside one render,
 * and none of them should cost a second query. Each still calls the same
 * factory `src/composition/handlers.ts` calls — one implementation, two
 * callers.
 */
export const readProgramOverview = cache(
  async (userId: string): Promise<IProgramOverview> =>
    makeGetProgramOverview(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readProgramDay = cache(
  async (userId: string, dayIndex: number): Promise<IProgramDayDetail> =>
    makeGetProgramDay(createContainer(crypto.randomUUID())).execute({ userId, dayIndex }),
);

export const readMasterySnapshot = cache(
  async (userId: string): Promise<IMasterySnapshot> =>
    makeGetMasterySnapshot(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readWeeklyActivity = cache(
  async (userId: string): Promise<IWeeklyActivity> =>
    makeGetWeeklyActivity(createContainer(crypto.randomUUID())).execute({ userId }),
);

/** The cap is the use case's own product decision (`06-spaced-repetition.md`), not a page's. */
export const readDueReviews = cache(
  async (userId: string): Promise<IDueReviewQueue> =>
    makeGetDueReviewItems(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readPhonemeStrips = cache(
  async (userId: string, wordIds: readonly string[]): Promise<readonly IWordPhonemeStrip[]> =>
    makeGetPhonemeStrips(createContainer(crypto.randomUUID())).execute({ userId, wordIds }),
);

export const readExamMilestones = cache(
  async (userId: string): Promise<readonly IExamMilestone[]> =>
    makeListExamMilestones(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readNextExam = cache(
  async (userId: string): Promise<INextExam | null> =>
    makeGetNextExam(createContainer(crypto.randomUUID())).execute({ userId }),
);
