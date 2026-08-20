import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type ExamAnswer } from '../../domain/entities/exam-answer';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import {
  ExamAnswerMarker,
  type IMark,
  type IPronunciationJudge,
} from '../../domain/services/exam-answer-marker';
import { ExamPrescriptionService } from '../../domain/services/exam-prescription.service';
import { ExamScoringService } from '../../domain/services/exam-scoring.service';
import { type ExamSectionCode } from '../../domain/value-objects/exam-section-code';
import { type IExamWriteUnit } from '../ports/exam-write-unit';

export interface ISubmitExamAttemptInput {
  readonly userId: string;
  readonly attemptId: string;
}

export interface IExamOutcome {
  readonly attemptId: string;
  readonly scorePercent: number;
  readonly passed: boolean;
  /** Null for the ungraded diagnostic — there is no mark to have missed. */
  readonly passPercent: number | null;
  readonly sectionScores: Readonly<Partial<Record<ExamSectionCode, number>>>;
  /** Rule 7: the day they are on now. Unchanged unless they passed. */
  readonly currentDayIndex: number;
  /** Rule 8: how many drills the failure put in front of them. */
  readonly prescribedItems: number;
}

/**
 * Hands the paper in, marks it, and acts on the result.
 *
 * Four things happen and they are four different responsibilities, each in its
 * own pure service: `ExamAnswerMarker` decides whether each answer was right,
 * `ExamScoringService` weights the sections, `ExamDefinition.passes()` decides
 * the outcome, and `ExamPrescriptionService` turns a failure into work. This
 * use case reads, calls them in order, and writes once.
 *
 * The write is **one Postgres function** (016), because every partial outcome
 * is worse than the failure that caused it — marks with no outcome leave the
 * attempt stuck `in_progress` past its deadline and blocking the retake the
 * learner has earned.
 *
 * Submission is deliberately **not** refused after the deadline. An attempt
 * that ran out of time is submitted, not rejected: that is exactly what the
 * cron backstop does to an abandoned one, and a learner who clicks submit on
 * the final second must not lose the work either. Rule 2 governs *answers*, and
 * it has already stopped them changing any.
 */
export class SubmitExamAttemptUseCase {
  private readonly scoring = new ExamScoringService();
  private readonly prescriptions = new ExamPrescriptionService();
  private readonly marker: ExamAnswerMarker;

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly policy: IReviewSchedulingPolicy,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly writes: IExamWriteUnit,
    judge: IPronunciationJudge,
  ) {
    this.marker = new ExamAnswerMarker(judge);
  }

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
    // wants it, and the reason `findByAttempt` and `findByAttemptForLearner`
    // are two different methods.
    const [questions, saved, history] = await Promise.all([
      this.questions.findByAttempt(attempt.id),
      this.answers.findByAttempt(attempt.id),
      this.reviews.findByProfile(profile.id),
    ]);

    const savedByQuestion = new Map(saved.map((answer) => [answer.questionId, answer]));
    const marks = new Map<string, IMark>();
    const marked: ExamAnswer[] = [];

    for (const question of questions) {
      const answer = savedByQuestion.get(question.id) ?? null;
      const mark = await this.marker.mark(question, answer);

      marks.set(question.id, mark);

      // Only rows that exist are updated. A question nobody answered has no
      // row, and inventing a blank one at submission would make "unanswered"
      // and "answered wrongly" indistinguishable on the review screen.
      if (answer !== null) {
        marked.push(answer.marked(mark.isCorrect, mark.awardedPoints));
      }
    }

    const score = this.scoring.score(definition, questions, marked);

    const now = this.clock.now();
    const submitted = attempt.submit(now);
    const graded = submitted.grade(score.scorePercent, score.sectionScores, score.passed);

    // Rule 8. A pass prescribes nothing — the learner has demonstrated the
    // block and sending them drills would contradict the result they just got.
    const prescription = score.passed
      ? []
      : this.prescriptions.prescribe({
          profileId: profile.id,
          questions,
          marks,
          existing: history,
          now,
          localDay: LocalDate.fromInstant(now, profile.timezone),
          timezone: profile.timezone,
          policy: this.policy,
          newId: () => this.ids.next(),
        });

    // Rule 7. Only a graded pass moves anybody, and only forwards: a learner
    // already past the unlock day has nothing to gain and would be sent
    // backwards by a naive assignment. 016 guards that in SQL as well.
    const advanceToDayIndex =
      score.passed && definition.isGraded()
        ? Math.max(profile.currentDayIndex.value, definition.unlockDayFor(profile.track) + 1)
        : null;

    await this.writes.submitAttempt({
      attempt: graded,
      answers: marked,
      prescription,
      advanceToDayIndex,
    });

    return {
      attemptId: graded.id,
      scorePercent: score.scorePercent.value,
      passed: score.passed,
      passPercent: definition.passPercent,
      sectionScores: score.sectionScores,
      currentDayIndex: advanceToDayIndex ?? profile.currentDayIndex.value,
      prescribedItems: prescription.length,
    };
  }
}
