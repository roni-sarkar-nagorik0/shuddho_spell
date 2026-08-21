import 'server-only';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { type AccentPreference } from '@/modules/auth/domain/value-objects/accent-preference';
import { type IUserRoster } from '@/modules/auth/application/dto/user-summary';
import { type IExamResultView, type IExamAnswerReviewView } from '@/modules/exams/application/dto/exam-result-view';
import {
  type ICertificateVerification,
  type ICertificateView,
} from '@/modules/certificates/application/dto/certificate-view';
import { type IExamCatalogue } from '@/modules/exams/application/dto/exam-catalogue';
import { type IExamMilestone } from '@/modules/exams/application/dto/exam-milestone';
import { type INextExam } from '@/modules/exams/application/dto/next-exam';
import { type IGrammarLessonView } from '@/modules/grammar/application/dto/grammar-lesson-view';
import { type IGrammarSyllabus } from '@/modules/grammar/application/dto/grammar-syllabus';
import { type IDictationDemoWord } from '@/modules/library/application/dto/dictation-demo-word';
import { type ILibraryPage } from '@/modules/library/application/dto/library-page';
import { type IWordFamilyPage } from '@/modules/library/application/dto/word-family-view';
import { type IWordPhonemeStrip } from '@/modules/library/application/dto/phoneme-strip';
import { type IProgramDayDetail } from '@/modules/program/application/dto/program-day-detail';
import { type IProgramOverview } from '@/modules/program/application/dto/program-overview';
import { type ILearnerDashboard } from '@/modules/progress/application/dto/learner-dashboard';
import { type IMasterySnapshot } from '@/modules/progress/application/dto/mastery-snapshot';
import { type IProgressSummary } from '@/modules/progress/application/dto/progress-summary';
import { type IPractiseLog } from '@/modules/progress/application/dto/practise-log';
import { type IWordsPractised } from '@/modules/progress/application/dto/words-practised';
import { type PractiseSource } from '@/modules/progress/domain/repositories/practise-log-repository';
import { type IWeeklyActivity } from '@/modules/progress/application/dto/weekly-activity';
import { type IDueReviewQueue } from '@/modules/review/application/dto/due-review-item';
import { type IPracticeQueue } from '@/modules/review/application/dto/practice-queue';
import { type IWeakSpots } from '@/modules/review/application/dto/weak-spots';
import { DatabaseMetricsReader } from '@/modules/shared/infrastructure/adapters/database-metrics-reader';
import { type IMetricsSnapshot } from '@/modules/shared/application/ports/metrics-reader';
import { createContainer } from './container';
import { grammarLesson, grammarSyllabus } from './grammar';
import {
  makeGetDueReviewItems,
  makeGetLearnerDashboard,
  makeGetMasterySnapshot,
  makeGetPractiseLog,
  makeGetWordsPractised,
  makeGetNextExam,
  makeGetProgramDay,
  makeGetProgramOverview,
  makeGetProgressSummary,
  makeGetMe,
  makeListUsers,
  makeGetCertificate,
  makeGetExamAnswerReview,
  makeGetExamCatalogue,
  makeGetExamResult,
  makeGetDictationDemoWord,
  makeGetLibraryPage,
  makeGetWordFamilies,
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

/**
 * The admin roster, for `/admin`.
 *
 * Throws `NotAnAdminError` for anyone else, and the page lets it — a screen
 * that checked the role itself and then called this would be two places
 * deciding the same thing, and the one that matters is the one in front of the
 * data. `ListUsersUseCase` reads the caller's role from the database before it
 * reads a single other row.
 */
export const readUserRoster = cache(
  async (userId: string): Promise<IUserRoster> =>
    makeListUsers(createContainer(crypto.randomUUID())).execute({ userId }),
);

/**
 * Whether to draw the Admin link in the rail.
 *
 * Memoised alongside every other per-request read, so the layout asking this
 * and the page asking for the roster cost one profile lookup between them.
 * It is a presentation decision only: hiding the link protects nothing, and the
 * endpoints behind it do their own checking.
 */
export const readIsAdmin = cache(async (userId: string): Promise<boolean> => {
  const profile = await makeGetMe(createContainer(crypto.randomUUID())).execute({ userId });

  return profile.isAdmin();
});

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

/**
 * The first page of the word families.
 *
 * `cache`, not `unstable_cache`: the families are a compiled module and the one
 * query behind this — the 24 rule statements — is already trivial. What is
 * worth avoiding is running it twice in one render, which is exactly what
 * React's per-request memo does. A cross-request cache would be storing content
 * that ships in the bundle.
 */
export const readWordFamilies = cache(
  async (pageSize: number): Promise<IWordFamilyPage> =>
    makeGetWordFamilies(createContainer(crypto.randomUUID())).execute({ pageSize }),
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

/**
 * How many distinct demo words the landing page keeps warm.
 *
 * The number is a trade between variety and the front door's budget. Each slot
 * is one cached word; a visitor is handed a slot at random, so the demo still
 * differs between visits and between reloads. Twenty-four is well past the
 * point where a visitor could notice a repeat — they see maybe five words —
 * and small enough that the whole set is one page of cache entries.
 */
const DEMO_WORD_SLOTS = 24;

/**
 * How long a slot holds its word. An hour, because the corpus is seeded content
 * that changes when somebody runs `content:seed`, not while a visitor reads.
 */
const DEMO_WORD_TTL_SECONDS = 3600;

/**
 * One slot's word, held in the data cache.
 *
 * **This is the landing page's single most expensive line, and it used to run
 * on every anonymous hit.** The use case draws a whole week of the corpus —
 * ~310 rows, 124 KB over the wire from Seoul, measured at 180–300 ms — filters
 * it, and keeps one word. Doing that per visitor is paying a fifth of a second
 * of the front door's budget to throw 309 words away.
 *
 * The pick stays random; what is cached is the result of a pick, not the pick
 * itself. `IDictationDemoWord` is a plain DTO, which is why it can live in the
 * data cache at all — a `Word` entity could not, because the cache serialises
 * and a class would come back without its methods.
 */
const readDemoWordSlot = (slot: number): Promise<IDictationDemoWord | null> =>
  unstable_cache(
    async () => makeGetDictationDemoWord(createContainer(crypto.randomUUID())).execute(),
    ['dictation-demo-word', String(slot)],
    { revalidate: DEMO_WORD_TTL_SECONDS, tags: ['dictation-demo-word'] },
  )();

/**
 * The demo's first word, resolved during the landing page's own render.
 *
 * **Not** memoised per request, and that is the one deliberate exception on this
 * page: every other read here is wrapped in `cache` so a layout and its page
 * share one execution, but the whole value of this one is that it differs.
 * Memoising a random pick is a way of making it stop being random.
 *
 * It is *cached across* requests, though, which is a different thing — see
 * `readDemoWordSlot`. The randomness moves from "which word does the database
 * hand back" to "which of the warm words does this visitor get", and the page
 * stops spending a fifth of a second on a query whose answer it discards.
 */
export async function readDictationDemoWord(): Promise<IDictationDemoWord | null> {
  return readDemoWordSlot(Math.floor(Math.random() * DEMO_WORD_SLOTS));
}

/**
 * Today's practice, for the dashboard panel. Memoised per request like every
 * other read here — the panel and anything else that wants the figure share one
 * execution.
 */
export const readWordsPractised = cache(
  async (userId: string): Promise<IWordsPractised> =>
    makeGetWordsPractised(createContainer(crypto.randomUUID())).execute({ userId }),
);

/**
 * One page of the practice log. Memoised per request, like every read here —
 * the page and its heading ask for the same page and pay for it once.
 */
export const readPractiseLog = cache(
  async (userId: string, source: PractiseSource, page: number): Promise<IPractiseLog> =>
    makeGetPractiseLog(createContainer(crypto.randomUUID())).execute({ userId, source, page }),
);

/**
 * The grammar course.
 *
 * Wired in `grammar.ts` rather than through a container: there is no database
 * behind this and no request scope to respect — see the note there.
 *
 * Memoised like every other read here, and here it is nearly free: the adapter
 * reads a compiled-in array rather than a database, so the cache saves a map
 * over 28 rows rather than a round trip. It is wrapped anyway, because the rule
 * on this page is that a read is memoised — and "today's adapter happens to be
 * cheap" is a fact about the adapter, not about the read.
 */
export const readGrammarSyllabus = cache(
  async (): Promise<IGrammarSyllabus> => grammarSyllabus(),
);

/** One day of the grammar course, or null when there is no such day. */
export const readGrammarLesson = cache(
  async (dayIndex: number): Promise<IGrammarLessonView | null> => grammarLesson(dayIndex),
);
