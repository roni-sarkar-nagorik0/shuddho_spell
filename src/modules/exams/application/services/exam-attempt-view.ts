import { type ExamAnswer } from '../../domain/entities/exam-answer';
import { type ExamAttempt } from '../../domain/entities/exam-attempt';
import { type ExamDefinition } from '../../domain/entities/exam-definition';
import { type IExamQuestionForLearner } from '../../domain/entities/exam-question';
import { type IExamAttemptView } from '../dto/exam-attempt-view';

/**
 * The one shape the exam runtime is ever given, built in one place.
 *
 * Starting an attempt, resuming one and reconnecting to one all return this,
 * and they must agree exactly — a resume that reported the deadline differently
 * from the start would be a bug nobody notices until a learner loses time. So
 * there is one function rather than three views that look alike today.
 *
 * `remainingSeconds` is computed **here**, from the attempt's stored deadline
 * and the server's `now`. That is rule 6: a refresh at the thirty-second mark
 * comes back with thirty seconds, because the number is derived from a column
 * and a clock the browser cannot touch, not from anything it sent.
 *
 * The questions are `IExamQuestionForLearner`, which has no field for the
 * answer key. Rule 3 costs nothing here because there is nothing to remember.
 */
export function buildExamAttemptView(input: {
  readonly definition: ExamDefinition;
  readonly attempt: ExamAttempt;
  readonly questions: readonly IExamQuestionForLearner[];
  readonly answers: readonly ExamAnswer[];
  readonly now: Date;
}): IExamAttemptView {
  const { attempt, definition, now } = input;

  return {
    attemptId: attempt.id,
    code: definition.code,
    title: definition.title,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    currentSectionIndex: attempt.currentSectionIndex,
    currentSectionCode: definition.sectionAt(attempt.currentSectionIndex)?.code ?? null,
    sectionCount: definition.sectionCount,
    remainingSeconds: attempt.remainingSeconds(now),
    serverDeadlineAt: (attempt.serverDeadlineAt ?? now).toISOString(),
    questions: input.questions,
    answers: input.answers.map((answer) => ({
      questionId: answer.questionId,
      submittedValue: answer.submittedValue,
      flagged: answer.flagged,
    })),
  };
}
