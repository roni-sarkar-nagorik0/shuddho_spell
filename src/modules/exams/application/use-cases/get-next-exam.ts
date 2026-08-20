import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { type ExamDefinition } from '../../domain/entities/exam-definition';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { ExamReadinessService } from '../../domain/services/exam-readiness.service';
import { type INextExam } from '../dto/next-exam';

export interface IGetNextExamInput {
  readonly userId: string;
}

/**
 * Which exam is next, and whether the learner is ready for it.
 *
 * "Next" is the earliest-unlocking exam the learner has **not yet passed**, not
 * simply the earliest one they have not sat: a learner who failed milestone1
 * and moved on still has milestone1 in front of them, and a dashboard that
 * pointed at milestone2 would be pointing past the thing actually blocking
 * them.
 *
 * The unlock day depends on the track — 004 stores both columns because day 14
 * of `standard28` and day 14 of `sprint21` are not the same point in the
 * programme.
 *
 * Readiness is predicted only for an exam that has unlocked. Before that there
 * is little to predict from, and a confident number derived from three days of
 * answers is worse than no number.
 */
export class GetNextExamUseCase {
  private readonly readiness = new ExamReadinessService();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly mastery: IMasteryRepository,
  ) {}

  async execute(input: IGetNextExamInput): Promise<INextExam | null> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const definitions = await this.definitions.listAll();
    const unlockDayOf = (definition: ExamDefinition): number =>
      profile.track === 'sprint21' ? definition.unlockDaySprint : definition.unlockDayStandard;

    const ordered = [...definitions].sort((a, b) => unlockDayOf(a) - unlockDayOf(b));

    // Five definitions, five reads, issued together. Awaiting inside the loop
    // would chain them, and this runs on the dashboard where six other reads
    // are already in flight — a serial chain of five is the one that decides
    // how long the page takes.
    const attemptsPerExam = await Promise.all(
      ordered.map(async (definition) => this.attempts.findForExam(profile.id, definition.id)),
    );

    for (const [index, definition] of ordered.entries()) {
      const priorAttempts = attemptsPerExam[index] ?? [];

      if (priorAttempts.some((attempt) => attempt.passed === true)) {
        continue;
      }

      const unlockDayIndex = unlockDayOf(definition);
      const daysUntilUnlock = unlockDayIndex - profile.currentDayIndex.value;
      const isUnlocked = daysUntilUnlock <= 0;

      const prediction = isUnlocked
        ? this.readiness.predict(
            definition,
            await this.mastery.findByProfile(profile.id),
            priorAttempts,
          )
        : null;

      return {
        code: definition.code,
        title: definition.title,
        unlockDayIndex,
        daysUntilUnlock,
        isUnlocked,
        durationSeconds: definition.durationSeconds,
        questionCount: definition.questionCount,
        passPercent: definition.passPercent,
        predictedScorePercent: prediction?.predictedScorePercent ?? null,
        likelyToPass: prediction?.likelyToPass ?? null,
      };
    }

    // Every exam passed. The dashboard shows the certificate panel instead.
    return null;
  }
}
