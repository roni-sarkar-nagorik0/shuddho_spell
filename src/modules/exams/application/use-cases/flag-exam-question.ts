import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { ExamAnswer } from '../../domain/entities/exam-answer';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import { type ISavedAnswer } from './save-exam-answer';

export interface IFlagExamQuestionInput {
  readonly userId: string;
  readonly attemptId: string;
  readonly questionId: string;
  readonly flagged: boolean;
}

/**
 * Marks a question to come back to.
 *
 * Deliberately **not** merged into `SaveExamAnswer` despite writing the same
 * row. Flagging is independent of answering — a learner flags questions they
 * have answered and want to re-read as often as ones they have skipped — and a
 * combined use case would have to decide what an absent `submittedValue`
 * means. Here it means nothing, because there is no such field.
 *
 * It is still a write, so it is still refused past the deadline. A flag after
 * time is up changes a row on a closed paper, and rule 2 says no write does.
 */
export class FlagExamQuestionUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: IFlagExamQuestionInput): Promise<ISavedAnswer> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const attempt = await this.attempts.findById(input.attemptId);

    if (attempt === null || attempt.profileId !== profile.id) {
      throw new ExamNotFoundError(input.attemptId);
    }

    const now = this.clock.now();

    attempt.assertWritable(now);

    const question = await this.questions.findById(input.questionId);

    if (question === null || question.attemptId !== attempt.id) {
      throw new ExamNotFoundError(input.questionId);
    }

    const existing = await this.answers.findByQuestion(question.id);

    // A flag on a question they have not answered creates the row. The blank
    // carries no value and no `answered_at`, so it does not look answered.
    const answer = (
      existing ??
      ExamAnswer.blank({
        id: this.ids.next(),
        questionId: question.id,
        attemptId: attempt.id,
        profileId: profile.id,
      })
    ).withFlag(input.flagged);

    const saved = await this.answers.upsert(answer);

    return {
      questionId: saved.questionId,
      submittedValue: saved.submittedValue,
      flagged: saved.flagged,
      remainingSeconds: attempt.remainingSeconds(now),
    };
  }
}
