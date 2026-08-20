import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import { type IExamAttemptView } from '../dto/exam-attempt-view';
import { buildExamAttemptView } from '../services/exam-attempt-view';

export interface IGetActiveExamAttemptInput {
  readonly userId: string;
}

/**
 * Picks a learner back up wherever they were.
 *
 * Rule 6: **a crash loses nothing.** A closed browser, a refreshed tab, a dead
 * battery — every one of them comes back to the same attempt, the same
 * section, the saved answers, and the seconds that are genuinely left. There is
 * no session state anywhere but the database, which is why this works: nothing
 * was in the tab that mattered.
 *
 * The time that actually elapsed is deducted because it is never *added* in the
 * first place. `remainingSeconds` is `serverDeadlineAt - now`, and a learner
 * away for ten minutes comes back to ten fewer. That is the point — an exam
 * whose clock stopped when the tab closed is an exam with no time limit.
 *
 * `null` rather than a 404 when there is nothing running. "Are you mid-exam?"
 * is a question with a legitimate answer of "no", and the runtime asks it on
 * every load.
 */
export class GetActiveExamAttemptUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetActiveExamAttemptInput): Promise<IExamAttemptView | null> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const attempt = await this.attempts.findActiveForProfile(profile.id);

    if (attempt === null) {
      return null;
    }

    const definition = await this.definitions.findById(attempt.definitionId);

    if (definition === null) {
      throw new ExamNotFoundError(attempt.definitionId);
    }

    const [questions, answers] = await Promise.all([
      this.questions.findByAttemptForLearner(attempt.id),
      this.answers.findByAttempt(attempt.id),
    ]);

    // Deliberately **not** submitted here even when the deadline has passed.
    // A read that writes is a read that behaves differently under a refresh,
    // and finishing an abandoned attempt is the cron backstop's job (F7.13).
    // What this returns for an expired attempt is zero seconds remaining,
    // which is true, and the runtime submits.
    return buildExamAttemptView({
      definition,
      attempt,
      questions,
      answers,
      now: this.clock.now(),
    });
  }
}
