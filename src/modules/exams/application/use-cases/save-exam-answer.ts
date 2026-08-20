import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { ExamAnswer } from '../../domain/entities/exam-answer';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';

export interface ISaveExamAnswerInput {
  readonly userId: string;
  readonly attemptId: string;
  readonly questionId: string;
  readonly submittedValue: string;
  readonly timeSpentMs: number | null;
}

export interface ISavedAnswer {
  readonly questionId: string;
  readonly submittedValue: string | null;
  readonly flagged: boolean;
  /** From the server's clock, so the client can resynchronise its countdown. */
  readonly remainingSeconds: number;
}

/**
 * Saves one answer, if the paper is still open.
 *
 * **`attempt.assertWritable(now)` is the whole feature.** It refuses a finished
 * attempt as an illegal transition and an overdue one as
 * `ExamTimeExpiredError`, and the two are distinct because the client's
 * reaction differs: a replay needs no action, an expiry needs the runtime to
 * stop the clock and stop accepting input. Rule 2 of `08-exam-engine.md` puts
 * the second at 409 `EXAM_TIME_EXPIRED`.
 *
 * The deadline compared against is the **stored one**. There is no argument to
 * this method that could carry a client's opinion of the time, which is what
 * makes "move the system clock forward mid-attempt" a non-event: the browser's
 * clock is display, and nothing here reads it.
 *
 * Every response carries the remaining seconds, so the runtime resynchronises
 * on every save rather than trusting its own interpolation for an hour.
 */
export class SaveExamAnswerUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: ISaveExamAnswerInput): Promise<ISavedAnswer> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const attempt = await this.attempts.findById(input.attemptId);

    // "Not yours" and "not there" are the same answer, deliberately: telling
    // them apart confirms which attempt ids exist.
    if (attempt === null || attempt.profileId !== profile.id) {
      throw new ExamNotFoundError(input.attemptId);
    }

    const now = this.clock.now();

    attempt.assertWritable(now);

    const question = await this.questions.findById(input.questionId);

    // A question id from another attempt — anybody's — is refused here. The id
    // arrives in the body, so this is not hypothetical.
    if (question === null || question.attemptId !== attempt.id) {
      throw new ExamNotFoundError(input.questionId);
    }

    const existing = await this.answers.findByQuestion(question.id);

    const answer = (
      existing ??
      ExamAnswer.blank({
        id: this.ids.next(),
        questionId: question.id,
        attemptId: attempt.id,
        profileId: profile.id,
      })
    ).withValue(input.submittedValue, now, input.timeSpentMs);

    const saved = await this.answers.upsert(answer);

    return {
      questionId: saved.questionId,
      submittedValue: saved.submittedValue,
      flagged: saved.flagged,
      remainingSeconds: attempt.remainingSeconds(now),
    };
  }
}
