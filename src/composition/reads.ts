import 'server-only';
import { cache } from 'react';
import { type AccentPreference } from '@/modules/auth/domain/value-objects/accent-preference';
import { type IExamResultView, type IExamAnswerReviewView } from '@/modules/exams/application/dto/exam-result-view';
import {
  type ICertificateVerification,
  type ICertificateView,
} from '@/modules/certificates/application/dto/certificate-view';
import { type IExamCatalogue } from '@/modules/exams/application/dto/exam-catalogue';
import { type IExamMilestone } from '@/modules/exams/application/dto/exam-milestone';
import { type INextExam } from '@/modules/exams/application/dto/next-exam';
import { type ILibraryPage } from '@/modules/library/application/dto/library-page';
import { type IWordPhonemeStrip } from '@/modules/library/application/dto/phoneme-strip';
import { type IProgramDayDetail } from '@/modules/program/application/dto/program-day-detail';
import { type IProgramOverview } from '@/modules/program/application/dto/program-overview';
import { type ILearnerDashboard } from '@/modules/progress/application/dto/learner-dashboard';
import { type IMasterySnapshot } from '@/modules/progress/application/dto/mastery-snapshot';
import { type IProgressSummary } from '@/modules/progress/application/dto/progress-summary';
import { type IWeeklyActivity } from '@/modules/progress/application/dto/weekly-activity';
import { type IDueReviewQueue } from '@/modules/review/application/dto/due-review-item';
import { type IPracticeQueue } from '@/modules/review/application/dto/practice-queue';
import { type IWeakSpots } from '@/modules/review/application/dto/weak-spots';
import { DatabaseMetricsReader } from '@/modules/shared/infrastructure/adapters/database-metrics-reader';
import { type IMetricsSnapshot } from '@/modules/shared/application/ports/metrics-reader';
import { createContainer } from './container';
import {
  makeGetDueReviewItems,
  makeGetLearnerDashboard,
  makeGetMasterySnapshot,
  makeGetNextExam,
  makeGetProgramDay,
  makeGetProgramOverview,
  makeGetProgressSummary,
  makeGetMe,
  makeGetCertificate,
  makeGetExamAnswerReview,
  makeGetExamCatalogue,
  makeGetExamResult,
  makeGetLibraryPage,
  makeGetPhonemeStrips,
  makeGetPracticeQueue,
  makeGetWeakSpots,
  makeGetWeeklyActivity,
  makeVerifyCertificate,
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
/**
 * The learner's audio settings, flattened.
 *
 * `GetMeUseCase` returns the `LearnerProfile` entity, and `src/app` may not
 * import a module's domain. Composition may import anything, so the mapping to
 * a plain readonly shape happens here — the one place allowed to see both
 * sides.
 */
export interface IAudioPreferencesView {
  readonly accent: AccentPreference;
  readonly playbackRate: number;
}

export const readAudioPreferences = cache(
  async (userId: string): Promise<IAudioPreferencesView> => {
    const profile = await makeGetMe(createContainer(crypto.randomUUID())).execute({ userId });

    return { accent: profile.accentPreference, playbackRate: profile.playbackRate };
  },
);

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

export const readActivity = cache(
  async (userId: string, days: number): Promise<IWeeklyActivity> =>
    makeGetWeeklyActivity(createContainer(crypto.randomUUID())).execute({ userId, days }),
);

/** The cap is the use case's own product decision (`06-spaced-repetition.md`), not a page's. */
export const readDueReviews = cache(
  async (userId: string): Promise<IDueReviewQueue> =>
    makeGetDueReviewItems(createContainer(crypto.randomUUID())).execute({ userId }),
);

/**
 * The 24 rule families, for the library's filter. Reference data, identical for
 * every learner, so it takes the container's repository directly rather than a
 * use case that would only forward the call.
 */
export const readRuleFamilies = cache(
  async (): Promise<readonly { readonly id: string; readonly code: string }[]> => {
    const families = await createContainer(crypto.randomUUID()).ruleFamilies.listAll();

    return families.map((family) => ({ id: family.id, code: family.code }));
  },
);

export const readLibraryPage = cache(
  async (userId: string, pageSize: number): Promise<ILibraryPage> =>
    makeGetLibraryPage(createContainer(crypto.randomUUID())).execute({ userId, pageSize }),
);

export const readPhonemeStrips = cache(
  async (userId: string, wordIds: readonly string[]): Promise<readonly IWordPhonemeStrip[]> =>
    makeGetPhonemeStrips(createContainer(crypto.randomUUID())).execute({ userId, wordIds }),
);

export const readPracticeQueue = cache(
  async (userId: string, focusDimensionId: string | undefined): Promise<IPracticeQueue> =>
    makeGetPracticeQueue(createContainer(crypto.randomUUID())).execute(
      focusDimensionId === undefined ? { userId } : { userId, focusDimensionId },
    ),
);

export const readWeakSpots = cache(
  async (userId: string): Promise<IWeakSpots> =>
    makeGetWeakSpots(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readExamCatalogue = cache(
  async (userId: string): Promise<IExamCatalogue> =>
    makeGetExamCatalogue(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readCertificate = cache(
  async (userId: string, certificateId: string): Promise<ICertificateView | null> =>
    makeGetCertificate(createContainer(crypto.randomUUID())).execute({ userId, certificateId }),
);

/**
 * The one read here that takes **no learner**.
 *
 * `/verify/[code]` is a public page, so it has no session to pass and must not
 * need one. It still goes through the composition root rather than fetching its
 * own API, exactly like every other Server Component.
 */
export const readCertificateVerification = cache(
  async (code: string): Promise<ICertificateVerification | null> =>
    makeVerifyCertificate(createContainer(crypto.randomUUID())).execute({ code }),
);

export const readExamResult = cache(
  async (userId: string, attemptId: string): Promise<IExamResultView> =>
    makeGetExamResult(createContainer(crypto.randomUUID())).execute({ userId, attemptId }),
);

export const readExamAnswerReview = cache(
  async (userId: string, attemptId: string): Promise<IExamAnswerReviewView> =>
    makeGetExamAnswerReview(createContainer(crypto.randomUUID())).execute({ userId, attemptId }),
);

export const readExamMilestones = cache(
  async (userId: string): Promise<readonly IExamMilestone[]> =>
    makeListExamMilestones(createContainer(crypto.randomUUID())).execute({ userId }),
);

export const readNextExam = cache(
  async (userId: string): Promise<INextExam | null> =>
    makeGetNextExam(createContainer(crypto.randomUUID())).execute({ userId }),
);

/**
 * The operational counts (F13.8).
 *
 * **Not** memoised: a scraper asks for fresh numbers and a cached gauge is a
 * lie with a timestamp on it. This is also the one read here with no learner
 * behind it — it counts the whole installation.
 */
export async function readMetrics(): Promise<IMetricsSnapshot> {
  const container = createContainer(crypto.randomUUID());

  return new DatabaseMetricsReader(container.db).snapshot(container.clock.now());
}
