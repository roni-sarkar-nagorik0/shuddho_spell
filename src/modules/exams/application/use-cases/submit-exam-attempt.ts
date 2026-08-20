import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import { type IExamOutcome } from '../dto/exam-outcome';
import { type ExamSubmissionService } from '../services/exam-submission.service';

export interface ISubmitExamAttemptInput {
  readonly userId: string;
  readonly attemptId: string;
}

export type { IExamOutcome };

/**
 * The learner hands the paper in.
 *
 * Ownership, then reads, then `ExamSubmissionService` — which is shared with
 * the cron backstop so an abandoned attempt is marked by exactly the same rules
 * as one submitted on time. Two implementations would drift, and the one that
 * drifted would be the one nobody watches.
 *
 * Submission is deliberately **not** refused after the deadline. An attempt
 * that ran out of time is submitted, not rejected: rule 2 governs *answers* and
 * has already stopped them changing any, and a learner clicking submit on the
 * final second must not lose the work.
 */
export class SubmitExamAttemptUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly clock: IClock,
    private readonly submissions: ExamSubmissionService,
  ) {}

  async execute(input: ISubmitExamAttemptInput): Promise<IExamOutcome> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const attempt = await this.attempts.findById(input.attemptId);

    if (attempt === null || attempt.profileId !== profile.id) {
      throw new ExamNotFoundError(input.attemptId);
    }

    const definition = await this.definitions.findById(attempt.definitionId);

    if (definition === null) {
      throw new ExamNotFoundError(attempt.definitionId);
    }

    // The read **with** the answer key — the only place in the module that
    // wants it, and why `findByAttempt` and `findByAttemptForLearner` are two
    // different methods.
    const [questions, answers, history] = await Promise.all([
      this.questions.findByAttempt(attempt.id),
      this.answers.findByAttempt(attempt.id),
      this.reviews.findByProfile(profile.id),
    ]);

    return this.submissions.submit({
      profile,
      definition,
      attempt,
      questions,
      answers,
      history,
      now: this.clock.now(),
    });
  }
}
