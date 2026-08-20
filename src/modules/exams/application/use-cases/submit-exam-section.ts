import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { SectionNotCurrentError } from '../../domain/errors/section-not-current.error';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type ExamSectionCode } from '../../domain/value-objects/exam-section-code';

export interface ISubmitExamSectionInput {
  readonly userId: string;
  readonly attemptId: string;
  readonly sectionCode: ExamSectionCode;
}

export interface ISectionSubmitted {
  readonly attemptId: string;
  readonly submittedSection: ExamSectionCode;
  readonly currentSectionIndex: number;
  readonly currentSectionCode: ExamSectionCode | null;
  /** True once every section is locked: the attempt is ready to hand in. */
  readonly isPaperComplete: boolean;
  readonly remainingSeconds: number;
}

/**
 * Locks a section. **One way, forwards, one at a time.**
 *
 * Rule 4 of `08-exam-engine.md` is that a submitted section cannot be reopened
 * by any endpoint — "not an admin one, not a debug one" — and the way that is
 * kept is not a check in this file. It is that `ExamAttempt` has **no method
 * that lowers `currentSectionIndex`**. There is nothing for a future endpoint
 * to call, so writing the endpoint does not create the hole; it would have to
 * add the method first, in the entity, where the rule is written down.
 *
 * The guard here is narrower and different: the code being submitted must be
 * the section the attempt is actually on. Submitting one already behind is a
 * replay, submitting one ahead would lock the section in between unsat, and
 * both are `SectionNotCurrentError` because both leave the paper describing
 * something that did not happen.
 */
export class SubmitExamSectionUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: ISubmitExamSectionInput): Promise<ISectionSubmitted> {
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

    const now = this.clock.now();

    // Ordering matters: writability first, so a learner whose time ran out is
    // told the paper closed rather than that they picked the wrong section.
    attempt.assertWritable(now);

    const current = definition.sectionAt(attempt.currentSectionIndex);

    if (current === null || current.code !== input.sectionCode) {
      throw new SectionNotCurrentError(attempt.id, input.sectionCode, current?.code ?? null);
    }

    const advanced = await this.attempts.save(attempt.advanceSection(now));
    const next = definition.sectionAt(advanced.currentSectionIndex);

    return {
      attemptId: advanced.id,
      submittedSection: input.sectionCode,
      currentSectionIndex: advanced.currentSectionIndex,
      currentSectionCode: next?.code ?? null,
      isPaperComplete: advanced.hasFinishedSections(definition.sectionCount),
      remainingSeconds: advanced.remainingSeconds(now),
    };
  }
}
