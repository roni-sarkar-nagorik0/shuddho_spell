import 'server-only';
import { BootstrapProfileUseCase } from '@/modules/auth/application/use-cases/bootstrap-profile';
import { GetMeUseCase } from '@/modules/auth/application/use-cases/get-me';
import { GetActiveExamAttemptUseCase } from '@/modules/exams/application/use-cases/get-active-exam-attempt';
import { GetExamAnswerReviewUseCase } from '@/modules/exams/application/use-cases/get-exam-answer-review';
import { GetExamReadinessUseCase } from '@/modules/exams/application/use-cases/get-exam-readiness';
import { GetExamResultUseCase } from '@/modules/exams/application/use-cases/get-exam-result';
import { AutoSubmitAbandonedExamsUseCase } from '@/modules/exams/application/use-cases/auto-submit-abandoned-exams';
import { FlagExamQuestionUseCase } from '@/modules/exams/application/use-cases/flag-exam-question';
import { SaveExamAnswerUseCase } from '@/modules/exams/application/use-cases/save-exam-answer';
import { StartExamAttemptUseCase } from '@/modules/exams/application/use-cases/start-exam-attempt';
import { SubmitExamAttemptUseCase } from '@/modules/exams/application/use-cases/submit-exam-attempt';
import { SubmitExamSectionUseCase } from '@/modules/exams/application/use-cases/submit-exam-section';
import { AdvanceLessonStageUseCase } from '@/modules/lessons/application/use-cases/advance-lesson-stage';
import { CompleteLessonSessionUseCase } from '@/modules/lessons/application/use-cases/complete-lesson-session';
import { StartLessonSessionUseCase } from '@/modules/lessons/application/use-cases/start-lesson-session';
import { SubmitConstructionAttemptUseCase } from '@/modules/lessons/application/use-cases/submit-construction-attempt';
import { SubmitDictationAttemptUseCase } from '@/modules/lessons/application/use-cases/submit-dictation-attempt';
import { SubmitPronunciationAttemptUseCase } from '@/modules/lessons/application/use-cases/submit-pronunciation-attempt';
import {
  SendDailyReminderUseCase,
  SendExamResultUseCase,
  SendExamUnlockedUseCase,
  SendReviewItemsDueUseCase,
  SendStreakAtRiskUseCase,
  SendWeeklyReportUseCase,
} from '@/modules/notifications/application/use-cases/dispatch-use-cases';
import { GetNotificationPreferencesUseCase } from '@/modules/notifications/application/use-cases/get-notification-preferences';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications';
import { MarkAllNotificationsReadUseCase } from '@/modules/notifications/application/use-cases/mark-all-notifications-read';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read';
import { RegisterPushSubscriptionUseCase } from '@/modules/notifications/application/use-cases/register-push-subscription';
import { RevokePushSubscriptionUseCase } from '@/modules/notifications/application/use-cases/revoke-push-subscription';
import { RunHourlyNotificationsUseCase } from '@/modules/notifications/application/use-cases/run-hourly-notifications';
import { UpdateNotificationPreferencesUseCase } from '@/modules/notifications/application/use-cases/update-notification-preferences';
import { GetProgramDayUseCase } from '@/modules/program/application/use-cases/get-program-day';
import { GetProgramOverviewUseCase } from '@/modules/program/application/use-cases/get-program-overview';
import { GetLearnerDashboardUseCase } from '@/modules/progress/application/use-cases/get-learner-dashboard';
import { GetMasterySnapshotUseCase } from '@/modules/progress/application/use-cases/get-mastery-snapshot';
import { GetWeeklyActivityUseCase } from '@/modules/progress/application/use-cases/get-weekly-activity';
import { GetCertificateUseCase } from '@/modules/certificates/application/use-cases/get-certificate';
import { VerifyCertificateUseCase } from '@/modules/certificates/application/use-cases/verify-certificate';
import { GetExamCatalogueUseCase } from '@/modules/exams/application/use-cases/get-exam-catalogue';
import { GetNextExamUseCase } from '@/modules/exams/application/use-cases/get-next-exam';
import { ListExamMilestonesUseCase } from '@/modules/exams/application/use-cases/list-exam-milestones';
import { GetLibraryPageUseCase } from '@/modules/library/application/use-cases/get-library-page';
import { GetPhonemeStripsUseCase } from '@/modules/library/application/use-cases/get-phoneme-strips';
import { GetPracticeQueueUseCase } from '@/modules/review/application/use-cases/get-practice-queue';
import { GetWeakSpotsUseCase } from '@/modules/review/application/use-cases/get-weak-spots';
import { GetProgressSummaryUseCase } from '@/modules/progress/application/use-cases/get-progress-summary';
import { GetDueReviewItemsUseCase } from '@/modules/review/application/use-cases/get-due-review-items';
import { SubmitReviewAttemptUseCase } from '@/modules/review/application/use-cases/submit-review-attempt';
import { type IContainer } from './container';

/**
 * One factory per use case. A use case never reaches into the container itself
 * — it takes interfaces through its constructor and is buildable with fakes
 * alone, which is the whole test for whether the wiring is right.
 *
 * The argument lists are long on purpose. A use case that needed a "service
 * locator" to shorten them would be one whose dependencies nobody can see, and
 * seeing them is what makes an N+1 or a missing transaction obvious here rather
 * than in production.
 */
export function makeBootstrapProfile(c: IContainer): BootstrapProfileUseCase {
  return new BootstrapProfileUseCase(c.learnerProfiles);
}

export function makeGetMe(c: IContainer): GetMeUseCase {
  return new GetMeUseCase(c.learnerProfiles);
}

export function makeGetProgramOverview(c: IContainer): GetProgramOverviewUseCase {
  return new GetProgramOverviewUseCase(c.learnerProfiles, c.program, c.lessons);
}

export function makeGetProgramDay(c: IContainer): GetProgramDayUseCase {
  return new GetProgramDayUseCase(
    c.learnerProfiles,
    c.program,
    c.words,
    c.sentenceItems,
    c.ruleFamilies,
  );
}

export function makeStartLessonSession(c: IContainer): StartLessonSessionUseCase {
  return new StartLessonSessionUseCase(c.learnerProfiles, c.lessons, c.clock, c.ids);
}

export function makeAdvanceLessonStage(c: IContainer): AdvanceLessonStageUseCase {
  return new AdvanceLessonStageUseCase(c.learnerProfiles, c.lessons);
}

export function makeCompleteLessonSession(c: IContainer): CompleteLessonSessionUseCase {
  return new CompleteLessonSessionUseCase(
    c.learnerProfiles,
    c.lessons,
    c.streaks,
    c.clock,
    c.ids,
    c.lessonWrites,
  );
}

export function makeSubmitDictationAttempt(c: IContainer): SubmitDictationAttemptUseCase {
  return new SubmitDictationAttemptUseCase(
    c.learnerProfiles,
    c.lessons,
    c.program,
    c.words,
    c.attempts,
    c.reviewItems,
    c.mastery,
    c.errorTagger,
    c.reviewPolicy,
    c.clock,
    c.ids,
    c.lessonWrites,
  );
}

/**
 * The longest argument list in the file, and the reason is visible in it: this
 * is the only use case that reads the stored G2P **and** scores speech **and**
 * writes the phoneme axis of the mastery matrix. Shortening it with a service
 * locator would hide exactly the dependencies worth seeing.
 */
export function makeSubmitPronunciationAttempt(c: IContainer): SubmitPronunciationAttemptUseCase {
  return new SubmitPronunciationAttemptUseCase(
    c.learnerProfiles,
    c.lessons,
    c.program,
    c.words,
    c.wordPhonemes,
    c.phonemes,
    c.reviewItems,
    c.mastery,
    c.speechScorer,
    c.reviewPolicy,
    c.clock,
    c.ids,
    c.lessonWrites,
  );
}

export function makeSubmitConstructionAttempt(c: IContainer): SubmitConstructionAttemptUseCase {
  return new SubmitConstructionAttemptUseCase(
    c.learnerProfiles,
    c.lessons,
    c.program,
    c.sentenceItems,
    c.attempts,
    c.reviewItems,
    c.mastery,
    c.errorTagger,
    c.reviewPolicy,
    c.clock,
    c.ids,
    c.lessonWrites,
  );
}

export function makeGetDueReviewItems(c: IContainer): GetDueReviewItemsUseCase {
  return new GetDueReviewItemsUseCase(
    c.learnerProfiles,
    c.reviewItems,
    c.words,
    c.sentenceItems,
    c.clock,
  );
}

export function makeSubmitReviewAttempt(c: IContainer): SubmitReviewAttemptUseCase {
  return new SubmitReviewAttemptUseCase(
    c.learnerProfiles,
    c.reviewItems,
    c.words,
    c.sentenceItems,
    c.errorTagger,
    c.reviewPolicy,
    c.clock,
  );
}

export function makeGetLearnerDashboard(c: IContainer): GetLearnerDashboardUseCase {
  return new GetLearnerDashboardUseCase(
    c.learnerProfiles,
    c.program,
    c.lessons,
    c.reviewItems,
    c.streaks,
    c.clock,
  );
}

export function makeGetProgressSummary(c: IContainer): GetProgressSummaryUseCase {
  return new GetProgressSummaryUseCase(
    c.learnerProfiles,
    c.lessons,
    c.streaks,
    c.mastery,
    c.clock,
  );
}

export function makeGetWeeklyActivity(c: IContainer): GetWeeklyActivityUseCase {
  return new GetWeeklyActivityUseCase(c.learnerProfiles, c.attempts, c.clock);
}

export function makeGetNextExam(c: IContainer): GetNextExamUseCase {
  return new GetNextExamUseCase(c.learnerProfiles, c.examDefinitions, c.examAttempts, c.mastery);
}

export function makeGetCertificate(c: IContainer): GetCertificateUseCase {
  return new GetCertificateUseCase(c.learnerProfiles, c.certificates);
}

/** The only use case with no learner behind it — see `VerifyCertificateUseCase`. */
export function makeVerifyCertificate(c: IContainer): VerifyCertificateUseCase {
  return new VerifyCertificateUseCase(c.certificates);
}

/*
 * There is no `makeIssueCertificate`. Issuance lives inside
 * `ExamSubmissionService`, which is the one path both the learner's submit
 * button and 009's cron backstop run through — a second implementation here
 * would be the version that drifts, and it would be the one that only fires
 * when somebody clicks.
 */

export function makeGetExamCatalogue(c: IContainer): GetExamCatalogueUseCase {
  return new GetExamCatalogueUseCase(
    c.learnerProfiles,
    c.examDefinitions,
    c.examAttempts,
    c.mastery,
    c.clock,
  );
}

export function makeListExamMilestones(c: IContainer): ListExamMilestonesUseCase {
  return new ListExamMilestonesUseCase(c.learnerProfiles, c.examDefinitions, c.examAttempts);
}

export function makeGetWeakSpots(c: IContainer): GetWeakSpotsUseCase {
  return new GetWeakSpotsUseCase(c.learnerProfiles, c.reviewItems, c.words, c.sentenceItems, c.clock);
}

export function makeGetPracticeQueue(c: IContainer): GetPracticeQueueUseCase {
  return new GetPracticeQueueUseCase(
    c.learnerProfiles,
    c.mastery,
    c.phonemes,
    c.ruleFamilies,
    makeGetDueReviewItems(c),
  );
}

export function makeGetLibraryPage(c: IContainer): GetLibraryPageUseCase {
  return new GetLibraryPageUseCase(c.learnerProfiles, c.words, c.ruleFamilies, c.reviewItems);
}

export function makeGetPhonemeStrips(c: IContainer): GetPhonemeStripsUseCase {
  return new GetPhonemeStripsUseCase(c.learnerProfiles, c.words, c.wordPhonemes, c.phonemes, c.mastery);
}

export function makeGetMasterySnapshot(c: IContainer): GetMasterySnapshotUseCase {
  return new GetMasterySnapshotUseCase(
    c.learnerProfiles,
    c.mastery,
    c.phonemes,
    c.ruleFamilies,
  );
}

export function makeStartExamAttempt(c: IContainer): StartExamAttemptUseCase {
  return new StartExamAttemptUseCase(
    c.learnerProfiles,
    c.examDefinitions,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
    c.words,
    c.sentenceItems,
    c.reviewItems,
    c.clock,
    c.ids,
    c.examWrites,
  );
}

export function makeSaveExamAnswer(c: IContainer): SaveExamAnswerUseCase {
  return new SaveExamAnswerUseCase(
    c.learnerProfiles,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
    c.clock,
    c.ids,
  );
}

export function makeFlagExamQuestion(c: IContainer): FlagExamQuestionUseCase {
  return new FlagExamQuestionUseCase(
    c.learnerProfiles,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
    c.clock,
    c.ids,
  );
}

export function makeSubmitExamSection(c: IContainer): SubmitExamSectionUseCase {
  return new SubmitExamSectionUseCase(c.learnerProfiles, c.examDefinitions, c.examAttempts, c.clock);
}

export function makeGetActiveExamAttempt(c: IContainer): GetActiveExamAttemptUseCase {
  return new GetActiveExamAttemptUseCase(
    c.learnerProfiles,
    c.examDefinitions,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
    c.clock,
  );
}

export function makeSubmitExamAttempt(c: IContainer): SubmitExamAttemptUseCase {
  return new SubmitExamAttemptUseCase(
    c.learnerProfiles,
    c.examDefinitions,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
    c.reviewItems,
    c.clock,
    c.examSubmissions,
  );
}

export function makeAutoSubmitAbandonedExams(c: IContainer): AutoSubmitAbandonedExamsUseCase {
  return new AutoSubmitAbandonedExamsUseCase(
    c.learnerProfiles,
    c.examDefinitions,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
    c.reviewItems,
    c.clock,
    c.examSubmissions,
  );
}

export function makeGetExamResult(c: IContainer): GetExamResultUseCase {
  return new GetExamResultUseCase(c.learnerProfiles, c.examDefinitions, c.examAttempts);
}

export function makeGetExamAnswerReview(c: IContainer): GetExamAnswerReviewUseCase {
  return new GetExamAnswerReviewUseCase(
    c.learnerProfiles,
    c.examAttempts,
    c.examQuestions,
    c.examAnswers,
  );
}

export function makeGetExamReadiness(c: IContainer): GetExamReadinessUseCase {
  return new GetExamReadinessUseCase(
    c.learnerProfiles,
    c.examDefinitions,
    c.examAttempts,
    c.mastery,
  );
}

export function makeListNotifications(c: IContainer): ListNotificationsUseCase {
  return new ListNotificationsUseCase(c.learnerProfiles, c.notifications);
}

export function makeMarkNotificationRead(c: IContainer): MarkNotificationReadUseCase {
  return new MarkNotificationReadUseCase(c.learnerProfiles, c.notifications, c.clock);
}

export function makeMarkAllNotificationsRead(c: IContainer): MarkAllNotificationsReadUseCase {
  return new MarkAllNotificationsReadUseCase(c.learnerProfiles, c.notifications, c.clock);
}

export function makeGetNotificationPreferences(c: IContainer): GetNotificationPreferencesUseCase {
  return new GetNotificationPreferencesUseCase(
    c.learnerProfiles,
    c.notificationPreferences,
    c.ids,
  );
}

export function makeUpdateNotificationPreferences(
  c: IContainer,
): UpdateNotificationPreferencesUseCase {
  return new UpdateNotificationPreferencesUseCase(
    c.learnerProfiles,
    c.notificationPreferences,
    c.ids,
  );
}

export function makeRegisterPushSubscription(c: IContainer): RegisterPushSubscriptionUseCase {
  return new RegisterPushSubscriptionUseCase(
    c.learnerProfiles,
    c.pushSubscriptions,
    c.clock,
    c.ids,
  );
}

export function makeRevokePushSubscription(c: IContainer): RevokePushSubscriptionUseCase {
  return new RevokePushSubscriptionUseCase(c.learnerProfiles, c.pushSubscriptions);
}

/**
 * The six dispatches. Each takes the one shared dispatcher and nothing else —
 * which is what stops any of them deciding for itself whether quiet hours
 * apply, or reaching a channel the policy did not select.
 */
export function makeSendDailyReminder(c: IContainer): SendDailyReminderUseCase {
  return new SendDailyReminderUseCase(c.notificationDispatcher);
}

export function makeSendStreakAtRisk(c: IContainer): SendStreakAtRiskUseCase {
  return new SendStreakAtRiskUseCase(c.notificationDispatcher);
}

export function makeSendReviewItemsDue(c: IContainer): SendReviewItemsDueUseCase {
  return new SendReviewItemsDueUseCase(c.notificationDispatcher);
}

export function makeSendExamUnlocked(c: IContainer): SendExamUnlockedUseCase {
  return new SendExamUnlockedUseCase(c.notificationDispatcher);
}

export function makeSendExamResult(c: IContainer): SendExamResultUseCase {
  return new SendExamResultUseCase(c.notificationDispatcher);
}

export function makeSendWeeklyReport(c: IContainer): SendWeeklyReportUseCase {
  return new SendWeeklyReportUseCase(c.notificationDispatcher);
}

export function makeRunHourlyNotifications(c: IContainer): RunHourlyNotificationsUseCase {
  return new RunHourlyNotificationsUseCase(
    c.learnerProfiles,
    c.notificationPreferences,
    c.reviewItems,
    c.streaks,
    c.clock,
    c.ids,
    makeSendDailyReminder(c),
    makeSendReviewItemsDue(c),
    makeSendStreakAtRisk(c),
  );
}
