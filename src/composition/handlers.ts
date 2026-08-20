import 'server-only';
import { createGetMeHandler } from '@/modules/auth/presentation/handlers/get-me';
import { createAutoSubmitCronHandler } from '@/modules/exams/presentation/handlers/auto-submit-cron';
import { createGetActiveAttemptHandler } from '@/modules/exams/presentation/handlers/get-active-attempt';
import { createGetAnswerReviewHandler } from '@/modules/exams/presentation/handlers/get-answer-review';
import { createGetReadinessHandler } from '@/modules/exams/presentation/handlers/get-readiness';
import { createGetResultHandler } from '@/modules/exams/presentation/handlers/get-result';
import { createSaveAnswerHandler } from '@/modules/exams/presentation/handlers/save-answer';
import { createStartAttemptHandler } from '@/modules/exams/presentation/handlers/start-attempt';
import { createSubmitAttemptHandler as createSubmitExamAttemptHandler } from '@/modules/exams/presentation/handlers/submit-attempt';
import { createSubmitSectionHandler } from '@/modules/exams/presentation/handlers/submit-section';
import { createAdvanceStageHandler } from '@/modules/lessons/presentation/handlers/advance-stage';
import { createStartSessionHandler } from '@/modules/lessons/presentation/handlers/start-session';
import { createSubmitAttemptHandler } from '@/modules/lessons/presentation/handlers/submit-attempt';
import {
  createGetPreferencesHandler,
  createListNotificationsHandler,
  createMarkAllReadHandler,
  createMarkReadHandler,
  createSubscribePushHandler,
  createUnsubscribePushHandler,
  createUpdatePreferencesHandler,
} from '@/modules/notifications/presentation/handlers/notification-handlers';
import { createGetProgramDayHandler } from '@/modules/program/presentation/handlers/get-program-day';
import { createGetProgramHandler } from '@/modules/program/presentation/handlers/get-program';
import { createGetMasteryHandler } from '@/modules/progress/presentation/handlers/get-mastery';
import { createGetProgressSummaryHandler } from '@/modules/progress/presentation/handlers/get-progress-summary';
import { createGetDueHandler } from '@/modules/review/presentation/handlers/get-due';
import { createSubmitReviewAttemptHandler } from '@/modules/review/presentation/handlers/submit-review-attempt';
import { createContainer } from './container';
import {
  makeAdvanceLessonStage,
  makeGetDueReviewItems,
  makeGetMe,
  makeGetNotificationPreferences,
  makeGetProgramDay,
  makeListNotifications,
  makeMarkAllNotificationsRead,
  makeMarkNotificationRead,
  makeRegisterPushSubscription,
  makeRevokePushSubscription,
  makeUpdateNotificationPreferences,
  makeGetMasterySnapshot,
  makeGetProgramOverview,
  makeGetProgressSummary,
  makeAutoSubmitAbandonedExams,
  makeFlagExamQuestion,
  makeGetActiveExamAttempt,
  makeGetExamAnswerReview,
  makeGetExamReadiness,
  makeGetExamResult,
  makeSaveExamAnswer,
  makeStartExamAttempt,
  makeSubmitExamAttempt,
  makeSubmitExamSection,
  makeStartLessonSession,
  makeSubmitConstructionAttempt,
  makeSubmitDictationAttempt,
  makeSubmitPronunciationAttempt,
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
  // One container for all three, so the use cases in this request share a
  // database handle rather than opening three.
  const c = container();

  return {
    dictation: makeSubmitDictationAttempt(c),
    pronunciation: makeSubmitPronunciationAttempt(c),
    construction: makeSubmitConstructionAttempt(c),
  };
});

export const getDueReviewHandler = createGetDueHandler(() => makeGetDueReviewItems(container()));

export const submitReviewAttemptHandler = createSubmitReviewAttemptHandler(() =>
  makeSubmitReviewAttempt(container()),
);

export const getProgressSummaryHandler = createGetProgressSummaryHandler(() =>
  makeGetProgressSummary(container()),
);

export const getMasteryHandler = createGetMasteryHandler(() => makeGetMasterySnapshot(container()));

export const startExamAttemptHandler = createStartAttemptHandler(() =>
  makeStartExamAttempt(container()),
);

export const saveExamAnswerHandler = createSaveAnswerHandler(() => {
  // One container, so both use cases in this request share a database handle.
  const c = container();

  return { save: makeSaveExamAnswer(c), flag: makeFlagExamQuestion(c) };
});

export const submitExamSectionHandler = createSubmitSectionHandler(() =>
  makeSubmitExamSection(container()),
);

export const getActiveExamAttemptHandler = createGetActiveAttemptHandler(() =>
  makeGetActiveExamAttempt(container()),
);

export const submitExamAttemptHandler = createSubmitExamAttemptHandler(() =>
  makeSubmitExamAttempt(container()),
);

export const getExamResultHandler = createGetResultHandler(() => makeGetExamResult(container()));

export const getExamAnswerReviewHandler = createGetAnswerReviewHandler(() =>
  makeGetExamAnswerReview(container()),
);

export const getExamReadinessHandler = createGetReadinessHandler(() =>
  makeGetExamReadiness(container()),
);

export const examAutoSubmitCronHandler = createAutoSubmitCronHandler(() =>
  makeAutoSubmitAbandonedExams(container()),
);

export const listNotificationsHandler = createListNotificationsHandler(() =>
  makeListNotifications(container()),
);

export const markNotificationReadHandler = createMarkReadHandler(() =>
  makeMarkNotificationRead(container()),
);

export const markAllNotificationsReadHandler = createMarkAllReadHandler(() =>
  makeMarkAllNotificationsRead(container()),
);

export const getNotificationPreferencesHandler = createGetPreferencesHandler(() =>
  makeGetNotificationPreferences(container()),
);

export const updateNotificationPreferencesHandler = createUpdatePreferencesHandler(() =>
  makeUpdateNotificationPreferences(container()),
);

export const subscribePushHandler = createSubscribePushHandler(() =>
  makeRegisterPushSubscription(container()),
);

export const unsubscribePushHandler = createUnsubscribePushHandler(() =>
  makeRevokePushSubscription(container()),
);
