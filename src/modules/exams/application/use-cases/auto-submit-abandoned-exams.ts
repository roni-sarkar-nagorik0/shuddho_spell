import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import { type ExamSubmissionService } from '../services/exam-submission.service';

export interface IAutoSubmitResult {
  readonly examined: number;
  readonly submitted: number;
  /** Attempts that could not be finished, by id. Reported, never swallowed. */
  readonly failed: readonly string[];
}

/**
 * Finishes attempts nobody came back to.
 *
 * Rule 9: **an abandoned attempt must never block a retake.** 004's partial
 * unique index allows one live attempt per exam, so a learner whose battery
 * died mid-milestone is locked out of that exam until something closes the
 * attempt — permanently, with no action they can take.
 *
 * This is the **backstop**, not the primary path. `pg_cron` runs 009's
 * `autosubmit_expired_exam_attempts()` inside the database, which works when
 * the app is entirely down, and that function deliberately only sets `submitted`
 * — the deadline passing is not a grade, and scoring belongs to the engine.
 * So this route meets attempts in either state: still `in_progress` because
 * pg_cron is not scheduled, or already `submitted` and waiting to be marked.
 *
 * One attempt's failure does not stop the others. A batch job that dies on its
 * third row leaves rows four onwards abandoned for another hour, and the whole
 * reason this exists is that being abandoned is what hurts.
 */
export class AutoSubmitAbandonedExamsUseCase {
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

  async execute(): Promise<IAutoSubmitResult> {
    const now = this.clock.now();
    const abandoned = await this.attempts.findAbandoned(now);

    const failed: string[] = [];
    let submitted = 0;

    for (const attempt of abandoned) {
      try {
        const profile = await this.profiles.findById(attempt.profileId);
        const definition = await this.definitions.findById(attempt.definitionId);

        if (profile === null || definition === null) {
          failed.push(attempt.id);
          continue;
        }

        const [questions, answers, history] = await Promise.all([
          this.questions.findByAttempt(attempt.id),
          this.answers.findByAttempt(attempt.id),
          this.reviews.findByProfile(profile.id),
        ]);

        await this.submissions.submit({
          profile,
          definition,
          attempt,
          questions,
          answers,
          history,
          now,
        });

        submitted += 1;
      } catch {
        // Swallowed **per attempt and reported in the result**, never silently:
        // the caller is a scheduler, and a 500 on attempt three would leave
        // four onwards abandoned until the next tick.
        failed.push(attempt.id);
      }
    }

    return { examined: abandoned.length, submitted, failed };
  }
}
