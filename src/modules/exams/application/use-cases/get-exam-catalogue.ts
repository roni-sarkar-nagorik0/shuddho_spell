import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type ExamAttempt } from '../../domain/entities/exam-attempt';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { ExamEligibilityPolicy } from '../../domain/services/exam-eligibility.policy';
import { ExamReadinessService } from '../../domain/services/exam-readiness.service';
import { type ExamLock, type IExamCatalogue, type IExamCatalogueEntry } from '../dto/exam-catalogue';

export interface IGetExamCatalogueInput {
  readonly userId: string;
}

/**
 * The five exams, with the learner's own state against each.
 *
 * **The lock is the server's.** It is produced by the same
 * `ExamEligibilityPolicy` that `StartExamAttempt` consults, so the catalogue's
 * disabled button and the endpoint's 409 cannot disagree — and a learner who
 * ignores the button is refused by the use case anyway. Rule 5 of
 * `08-exam-engine.md` is about who decides, not about where a function lives.
 *
 * Two locks can be true at once — a learner may be both short of the unlock day
 * and out of attempts — and the order below is deliberate: reaching the day is
 * reported first because it is the one that resolves on its own.
 *
 * Readiness is predicted only for an exam that has unlocked. A confident number
 * derived from three days of answers is worse than no number.
 */
export class GetExamCatalogueUseCase {
  private readonly eligibility = new ExamEligibilityPolicy();
  private readonly readiness = new ExamReadinessService();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly mastery: IMasteryRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: IGetExamCatalogueInput): Promise<IExamCatalogue> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const [definitions, records] = await Promise.all([
      this.definitions.listAll(),
      this.mastery.findByProfile(profile.id),
    ]);

    const now = this.clock.now();

    // Five reads, issued together rather than chained behind each other.
    const attemptsPerExam = await Promise.all(
      definitions.map(async (definition) => this.attempts.findForExam(profile.id, definition.id)),
    );

    const exams: readonly IExamCatalogueEntry[] = definitions
      .map((definition, index): IExamCatalogueEntry => {
        const priorAttempts = attemptsPerExam[index] ?? [];
        const unlockDayIndex =
          profile.track === 'sprint21' ? definition.unlockDaySprint : definition.unlockDayStandard;
        const daysAway = unlockDayIndex - profile.currentDayIndex.value;
        const isUnlocked = daysAway <= 0;

        const prediction = isUnlocked
          ? this.readiness.predict(definition, records, priorAttempts)
          : null;

        const scores = priorAttempts
          .map((attempt) => attempt.scorePercent?.value)
          .filter((score): score is number => score !== undefined);

        return {
          code: definition.code,
          title: definition.title,
          unlockDayIndex,
          durationSeconds: definition.durationSeconds,
          questionCount: definition.questionCount,
          passPercent: definition.passPercent,
          maxAttempts: definition.maxAttempts,
          cooldownHours: definition.cooldownHours,
          sections: definition.sections.map((section) => ({
            code: section.code,
            weight: section.weight,
            questionCount: section.questionCount,
          })),
          attemptsUsed: priorAttempts.length,
          bestScorePercent: scores.length === 0 ? null : Math.max(...scores),
          hasPassed: priorAttempts.some((attempt) => attempt.passed === true),
          lock: this.lockFor(definition, priorAttempts, now, unlockDayIndex, daysAway),
          predictedScorePercent: prediction?.predictedScorePercent ?? null,
          likelyToPass: prediction?.likelyToPass ?? null,
          activeAttemptId: activeAttemptOf(priorAttempts),
        };
      })
      .sort((a, b) => a.unlockDayIndex - b.unlockDayIndex);

    return { exams, currentDayIndex: profile.currentDayIndex.value };
  }

  private lockFor(
    definition: Parameters<ExamEligibilityPolicy['evaluate']>[0],
    priorAttempts: readonly ExamAttempt[],
    now: Date,
    unlockDayIndex: number,
    daysAway: number,
  ): ExamLock {
    if (daysAway > 0) {
      return { kind: 'not_reached', unlockDayIndex, daysAway };
    }

    const verdict = this.eligibility.evaluate(definition, priorAttempts, now);

    switch (verdict.kind) {
      case 'eligible':
        return { kind: 'open' };
      case 'exhausted':
        return { kind: 'exhausted', maxAttempts: verdict.maxAttempts, used: verdict.used };
      case 'cooling_down':
        return {
          kind: 'cooling_down',
          remainingSeconds: verdict.remainingSeconds,
          retryAt: verdict.retryAt.toISOString(),
        };
    }
  }
}

/**
 * An attempt still open. Resuming one beats starting another, and rule 9's cron
 * auto-submits anything past its deadline, so this is never a stale row for
 * long.
 */
function activeAttemptOf(attempts: readonly ExamAttempt[]): string | null {
  return attempts.find((attempt) => attempt.status === 'in_progress')?.id ?? null;
}
