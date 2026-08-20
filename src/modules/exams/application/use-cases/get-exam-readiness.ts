import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import {
  ExamReadinessService,
  type IExamReadiness,
} from '../../domain/services/exam-readiness.service';
import { type ExamCode } from '../../domain/value-objects/exam-code';

export interface IGetExamReadinessInput {
  readonly userId: string;
  readonly code: ExamCode;
}

/**
 * How the lobby answers "should I sit this now?".
 *
 * Three reads and one pure prediction. The reads are batched because this runs
 * on a page a learner opens repeatedly while deciding, and a lobby that costs
 * five queries to say "not yet" is a lobby people stop opening.
 */
export class GetExamReadinessUseCase {
  private readonly readiness = new ExamReadinessService();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly mastery: IMasteryRepository,
  ) {}

  async execute(input: IGetExamReadinessInput): Promise<IExamReadiness> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const definition = await this.definitions.findByCode(input.code);

    if (definition === null) {
      throw new ExamNotFoundError(input.code);
    }

    const [priorAttempts, mastery] = await Promise.all([
      this.attempts.findForExam(profile.id, definition.id),
      this.mastery.findByProfile(profile.id),
    ]);

    return this.readiness.predict(definition, mastery, priorAttempts);
  }
}
