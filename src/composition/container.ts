import 'server-only';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type INotificationPreferenceRepository } from '@/modules/notifications/domain/repositories/notification-preference-repository';
import { type INotificationRepository } from '@/modules/notifications/domain/repositories/notification-repository';
import { type IPushSubscriptionRepository } from '@/modules/notifications/domain/repositories/push-subscription-repository';
import { type IInAppNotifier } from '@/modules/notifications/application/ports/in-app-notifier';
import { type IPushSender } from '@/modules/notifications/application/ports/push-sender';
import { SupabaseNotificationPreferenceRepository } from '@/modules/notifications/infrastructure/persistence/supabase/notification-preference.repository';
import { SupabaseNotificationRepository } from '@/modules/notifications/infrastructure/persistence/supabase/notification.repository';
import { SupabasePushSubscriptionRepository } from '@/modules/notifications/infrastructure/persistence/supabase/push-subscription.repository';
import { NotificationDispatcher } from '@/modules/notifications/application/services/notification-dispatcher';
import { NotificationWriter } from '@/modules/notifications/infrastructure/adapters/notification-writer';
import { WebPushSender } from '@/modules/notifications/infrastructure/adapters/web-push-sender';
import { type IExamAnswerRepository } from '@/modules/exams/domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '@/modules/exams/domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '@/modules/exams/domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '@/modules/exams/domain/repositories/exam-question-repository';
import { type IExamWriteUnit } from '@/modules/exams/application/ports/exam-write-unit';
import { ExamSubmissionService } from '@/modules/exams/application/services/exam-submission.service';
import { SupabaseExamAnswerRepository } from '@/modules/exams/infrastructure/persistence/supabase/exam-answer.repository';
import { SupabaseExamAttemptRepository } from '@/modules/exams/infrastructure/persistence/supabase/exam-attempt.repository';
import { SupabaseExamDefinitionRepository } from '@/modules/exams/infrastructure/persistence/supabase/exam-definition.repository';
import { SupabaseExamQuestionRepository } from '@/modules/exams/infrastructure/persistence/supabase/exam-question.repository';
import { SupabaseExamWriteUnit } from '@/modules/exams/infrastructure/adapters/supabase-exam-write-unit';
import { SpeechScorerPronunciationJudge } from '@/modules/exams/infrastructure/adapters/speech-scorer-pronunciation-judge';
import { type IPronunciationJudge } from '@/modules/exams/domain/services/exam-answer-marker';
import { SupabaseLearnerProfileRepository } from '@/modules/auth/infrastructure/persistence/supabase/learner-profile.repository';
import { type IAttemptRepository } from '@/modules/lessons/domain/repositories/attempt-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { SupabaseAttemptRepository } from '@/modules/lessons/infrastructure/persistence/supabase/attempt.repository';
import { SupabaseLessonRepository } from '@/modules/lessons/infrastructure/persistence/supabase/lesson.repository';
import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordPhonemeRepository } from '@/modules/library/domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { ErrorTagger } from '@/modules/library/domain/services/error-tagger';
import { SupabasePhonemeRepository } from '@/modules/library/infrastructure/persistence/supabase/phoneme.repository';
import { SupabaseRuleFamilyRepository } from '@/modules/library/infrastructure/persistence/supabase/rule-family.repository';
import { SupabaseSentenceItemRepository } from '@/modules/library/infrastructure/persistence/supabase/sentence-item.repository';
import { SupabaseWordPhonemeRepository } from '@/modules/library/infrastructure/persistence/supabase/word-phoneme.repository';
import { SupabaseWordRepository } from '@/modules/library/infrastructure/persistence/supabase/word.repository';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { SupabaseProgramRepository } from '@/modules/program/infrastructure/persistence/supabase/program.repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { type IStreakRepository } from '@/modules/progress/domain/repositories/streak-repository';
import { SupabaseMasteryRepository } from '@/modules/progress/infrastructure/persistence/supabase/mastery.repository';
import { SupabaseStreakRepository } from '@/modules/progress/infrastructure/persistence/supabase/streak.repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { IntervalLadderPolicy } from '@/modules/review/domain/services/interval-ladder.policy';
import { SupabaseReviewItemRepository } from '@/modules/review/infrastructure/persistence/supabase/review-item.repository';
import { type ILessonWriteUnit } from '@/modules/lessons/application/ports/lesson-write-unit';
import { SupabaseLessonWriteUnit } from '@/modules/lessons/infrastructure/adapters/supabase-lesson-write-unit';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type ISpeechScorer } from '@/modules/shared/application/ports/speech-scorer';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { ConfusionMapSpeechScorer } from '@/modules/speech/infrastructure/adapters/confusion-map-speech-scorer';
import { SystemClock } from '@/modules/shared/infrastructure/adapters/system-clock';
import { UuidGenerator } from '@/modules/shared/infrastructure/adapters/uuid-generator';
import { RetryingDatabase } from '@/modules/shared/infrastructure/persistence/retrying-database';
import { toDatabase } from '@/modules/shared/infrastructure/persistence/supabase-database';

/**
 * The composition root — plain construction, no DI framework, no decorators.
 * One container per request; nothing here is cached across requests, because a
 * request-scoped client must not outlive its cookies.
 *
 * This is the only file that knows which implementation is behind a port. A use
 * case never reaches into it — the test for whether that holds is that every
 * use case is buildable with fakes and nothing else.
 */
export interface IContainer {
  readonly requestId: string;

  readonly learnerProfiles: ILearnerProfileRepository;
  readonly words: IWordRepository;
  /** The stored G2P — 002's `word_phonemes`, read at last. */
  readonly wordPhonemes: IWordPhonemeRepository;
  readonly sentenceItems: ISentenceItemRepository;
  readonly ruleFamilies: IRuleFamilyRepository;
  readonly phonemes: IPhonemeRepository;
  readonly program: IProgramRepository;
  readonly lessons: ILessonRepository;
  readonly attempts: IAttemptRepository;
  readonly reviewItems: IReviewItemRepository;
  readonly mastery: IMasteryRepository;
  readonly streaks: IStreakRepository;

  readonly examDefinitions: IExamDefinitionRepository;
  readonly examAttempts: IExamAttemptRepository;
  readonly examQuestions: IExamQuestionRepository;
  readonly examAnswers: IExamAnswerRepository;

  readonly notifications: INotificationRepository;
  readonly notificationPreferences: INotificationPreferenceRepository;
  readonly pushSubscriptions: IPushSubscriptionRepository;

  /**
   * Domain services. Stateless and pure, so one instance per request costs
   * nothing and keeps the rule that a use case is handed what it needs rather
   * than constructing it.
   */
  readonly reviewPolicy: IReviewSchedulingPolicy;
  readonly errorTagger: ErrorTagger;

  /** The two live channels. There is no third, and no `IMailer` to be one. */
  readonly inAppNotifier: IInAppNotifier;
  readonly pushSender: IPushSender;

  /**
   * The machinery all six dispatches share: the policy, the idempotency key,
   * and the two channels. One instance, so none of them can decide differently.
   */
  readonly notificationDispatcher: NotificationDispatcher;

  /** Pure and stateless too — a lookup over the confusion map, never a model. */
  readonly speechScorer: ISpeechScorer;

  /**
   * The exams module's view of that scorer. One per request, so the 44-phoneme
   * inventory it caches is read once per submission rather than once per
   * pronunciation question.
   */
  readonly pronunciationJudge: IPronunciationJudge;

  /** The writes that must not half-happen — 013 and 014's Postgres functions. */
  readonly lessonWrites: ILessonWriteUnit;

  /** The same, for exams — 015. An attempt and its paper, or neither. */
  readonly examWrites: IExamWriteUnit;

  /**
   * Marking, scoring and acting on the result — shared by the learner's submit
   * and the cron backstop, so an abandoned attempt is graded by exactly the
   * same rules as one handed in on time.
   */
  readonly examSubmissions: ExamSubmissionService;

  readonly clock: IClock;
  readonly ids: IIdGenerator;
}

export function createContainer(requestId: string): IContainer {
  // One database handle for every repository in the request. The service
  // client, because 008 gives the learner's own no insert policy on
  // `learner_profiles` and the use cases filter by `profile_id` explicitly.
  //
  // Wrapped so a serialization failure is retried once and the three Postgres
  // codes `03-database.md` names arrive as typed domain errors rather than as
  // messages a caller would have to string-match.
  const db = new RetryingDatabase(toDatabase());

  // Built before the object literal because two entries below share it: the
  // judge wraps the scorer, and both are handed out.
  const phonemes = new SupabasePhonemeRepository(db);
  const speechScorer = new ConfusionMapSpeechScorer();

  const examWrites = new SupabaseExamWriteUnit(db);
  const reviewPolicy = new IntervalLadderPolicy();
  const ids = new UuidGenerator();
  const pronunciationJudge = new SpeechScorerPronunciationJudge(phonemes, speechScorer);
  const notifications = new SupabaseNotificationRepository(db);
  const pushSubscriptions = new SupabasePushSubscriptionRepository(db);
  const notificationPreferences = new SupabaseNotificationPreferenceRepository(db);
  const inAppNotifier = new NotificationWriter(notifications);
  const pushSender = new WebPushSender(pushSubscriptions);

  return {
    requestId,

    learnerProfiles: new SupabaseLearnerProfileRepository(db),
    words: new SupabaseWordRepository(db),
    wordPhonemes: new SupabaseWordPhonemeRepository(db),
    sentenceItems: new SupabaseSentenceItemRepository(db),
    ruleFamilies: new SupabaseRuleFamilyRepository(db),
    phonemes,
    program: new SupabaseProgramRepository(db),
    lessons: new SupabaseLessonRepository(db),
    attempts: new SupabaseAttemptRepository(db),
    reviewItems: new SupabaseReviewItemRepository(db),
    mastery: new SupabaseMasteryRepository(db),
    streaks: new SupabaseStreakRepository(db),

    examDefinitions: new SupabaseExamDefinitionRepository(db),
    examAttempts: new SupabaseExamAttemptRepository(db),
    examQuestions: new SupabaseExamQuestionRepository(db),
    examAnswers: new SupabaseExamAnswerRepository(db),

    notifications,
    notificationPreferences,
    pushSubscriptions,

    inAppNotifier,
    pushSender,
    notificationDispatcher: new NotificationDispatcher(
      notifications,
      notificationPreferences,
      pushSubscriptions,
      inAppNotifier,
      pushSender,
      ids,
    ),

    reviewPolicy,
    errorTagger: new ErrorTagger(),
    speechScorer,
    pronunciationJudge,

    lessonWrites: new SupabaseLessonWriteUnit(db),
    examWrites,
    examSubmissions: new ExamSubmissionService(pronunciationJudge, reviewPolicy, ids, examWrites),

    clock: new SystemClock(),
    ids,
  };
}
