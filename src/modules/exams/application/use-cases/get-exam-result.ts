import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { ExamNotSubmittedError } from '../../domain/errors/exam-not-submitted.error';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { isTerminal } from '../../domain/value-objects/exam-status';
import { type IExamResultView } from '../dto/exam-result-view';

export interface IGetExamResultInput {
  readonly userId: string;
  readonly attemptId: string;
}

/**
 * The mark, after the fact.
 *
 * Refused before submission for the same reason the review is: a score that
 * exists mid-attempt is a score a learner can watch, and every leak of a live
 * score begins with it being computed early. Nothing computes one here — the
 * columns are read, and they are null until 016 fills them.
 *
 * `submitted` counts as finished as well as `passed` and `failed`, because the
 * diagnostic ends there: it is ungraded by design, and refusing to show a
 * learner their own placement result would be refusing the only thing that exam
 * produces.
 */
export class GetExamResultUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
  ) {}

  async execute(input: IGetExamResultInput): Promise<IExamResultView> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const attempt = await this.attempts.findById(input.attemptId);

    if (attempt === null || attempt.profileId !== profile.id) {
      throw new ExamNotFoundError(input.attemptId);
    }

    const submittedAt = attempt.submittedAt;

    if (submittedAt === null || !(isTerminal(attempt.status) || attempt.status === 'submitted')) {
      throw new ExamNotSubmittedError(attempt.id);
    }

    const definition = await this.definitions.findById(attempt.definitionId);

    if (definition === null) {
      throw new ExamNotFoundError(attempt.definitionId);
    }

    return {
      attemptId: attempt.id,
      code: definition.code,
      title: definition.title,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      scorePercent: attempt.scorePercent?.value ?? 0,
      passPercent: definition.passPercent,
      passed: attempt.passed,
      sections: definition.sections.map((section) => ({
        code: section.code,
        weight: section.weight,
        percent: attempt.sectionScores[section.code] ?? 0,
      })),
      submittedAt: submittedAt.toISOString(),
    };
  }
}
