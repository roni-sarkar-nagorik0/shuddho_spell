import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type IExamMilestone } from '../dto/exam-milestone';

export interface IListExamMilestonesInput {
  readonly userId: string;
}

/**
 * The five exams as rows on the programme table, ordered by the day they open.
 *
 * The unlock day comes from the learner's track, so a `sprint21` learner sees
 * milestone rows where their own programme puts them rather than where a
 * 28-day programme would.
 */
export class ListExamMilestonesUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
  ) {}

  async execute(input: IListExamMilestonesInput): Promise<readonly IExamMilestone[]> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const definitions = await this.definitions.listAll();

    const rows = await Promise.all(
      definitions.map(async (definition) => {
        const priorAttempts = await this.attempts.findForExam(profile.id, definition.id);
        const unlockDayIndex =
          profile.track === 'sprint21' ? definition.unlockDaySprint : definition.unlockDayStandard;

        // The earliest pass, not the latest: the date the learner cleared the
        // milestone is the one worth marking.
        const passedAt = priorAttempts
          .filter((attempt) => attempt.passed === true && attempt.submittedAt !== null)
          .map((attempt) => attempt.submittedAt)
          .sort((a, b) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0))[0];

        return {
          code: definition.code,
          title: definition.title,
          unlockDayIndex,
          isUnlocked: profile.currentDayIndex.value >= unlockDayIndex,
          hasPassed: priorAttempts.some((attempt) => attempt.passed === true),
          passedAt: passedAt?.toISOString() ?? null,
        };
      }),
    );

    return [...rows].sort((a, b) => a.unlockDayIndex - b.unlockDayIndex);
  }
}
