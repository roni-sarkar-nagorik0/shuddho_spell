import 'server-only';
import { BootstrapProfileUseCase } from '@/modules/auth/application/use-cases/bootstrap-profile';
import { GetMeUseCase } from '@/modules/auth/application/use-cases/get-me';
import { FlagExamQuestionUseCase } from '@/modules/exams/application/use-cases/flag-exam-question';
import { SaveExamAnswerUseCase } from '@/modules/exams/application/use-cases/save-exam-answer';
import { StartExamAttemptUseCase } from '@/modules/exams/application/use-cases/start-exam-attempt';
import { AdvanceLessonStageUseCase } from '@/modules/lessons/application/use-cases/advance-lesson-stage';
import { CompleteLessonSessionUseCase } from '@/modules/lessons/application/use-cases/complete-lesson-session';
import { StartLessonSessionUseCase } from '@/modules/lessons/application/use-cases/start-lesson-session';
import { SubmitConstructionAttemptUseCase } from '@/modules/lessons/application/use-cases/submit-construction-attempt';
import { SubmitDictationAttemptUseCase } from '@/modules/lessons/application/use-cases/submit-dictation-attempt';
import { SubmitPronunciationAttemptUseCase } from '@/modules/lessons/application/use-cases/submit-pronunciation-attempt';
import { GetProgramDayUseCase } from '@/modules/program/application/use-cases/get-program-day';
import { GetProgramOverviewUseCase } from '@/modules/program/application/use-cases/get-program-overview';
import { GetLearnerDashboardUseCase } from '@/modules/progress/application/use-cases/get-learner-dashboard';
import { GetMasterySnapshotUseCase } from '@/modules/progress/application/use-cases/get-mastery-snapshot';
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
