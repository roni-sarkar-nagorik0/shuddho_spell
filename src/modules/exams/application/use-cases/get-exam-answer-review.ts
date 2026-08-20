import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { ExamNotSubmittedError } from '../../domain/errors/exam-not-submitted.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import { isTerminal } from '../../domain/value-objects/exam-status';
import { type IExamAnswerReviewView } from '../dto/exam-result-view';

export interface IGetExamAnswerReviewInput {
  readonly userId: string;
  readonly attemptId: string;
}

/**
 * The one place in the product that returns correct answers.
 *
 * `08-exam-engine.md`: "`GET /exams/attempts/:id/review` returns correct
 * answers. **Every other exam route must not**, before submission." Rule 3 is
 * therefore a rule about *time*, not about routes, and this method is where the
 * time is checked — before anything is read, so an unsubmitted attempt never
 * even loads the key into memory.
 *
 * The ordering is deliberate: ownership, then submission, then the read with
 * the answers. Reversing the last two would mean a premature request still
 * pulled the key out of the database and relied on a `throw` further down to
 * keep it off the wire.
 */
export class GetExamAnswerReviewUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
  ) {}

  async execute(input: IGetExamAnswerReviewInput): Promise<IExamAnswerReviewView> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const attempt = await this.attempts.findById(input.attemptId);

    if (attempt === null || attempt.profileId !== profile.id) {
      throw new ExamNotFoundError(input.attemptId);
    }

    if (!(isTerminal(attempt.status) || attempt.status === 'submitted')) {
      throw new ExamNotSubmittedError(attempt.id);
    }

    const [questions, answers] = await Promise.all([
      this.questions.findByAttempt(attempt.id),
      this.answers.findByAttempt(attempt.id),
    ]);

    const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));

    return {
      attemptId: attempt.id,
      items: questions.map((question) => {
        const answer = byQuestion.get(question.id) ?? null;

        return {
          questionId: question.id,
          sectionCode: question.sectionCode,
          orderIndex: question.orderIndex,
          payload: question.payload,
          submittedValue: answer?.submittedValue ?? null,
          isCorrect: answer?.isCorrect ?? null,
          awardedPoints: answer?.awardedPoints ?? 0,
          flagged: answer?.flagged ?? false,
          correctAnswer: question.correctAnswer,
        };
      }),
    };
  }
}
