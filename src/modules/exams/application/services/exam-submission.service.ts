import { type LearnerProfile } from '@/modules/auth/domain/entities/learner-profile';
import { type ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { type ExamAnswer } from '../../domain/entities/exam-answer';
import { type ExamAttempt } from '../../domain/entities/exam-attempt';
import { type ExamDefinition } from '../../domain/entities/exam-definition';
import { type ExamQuestion } from '../../domain/entities/exam-question';
import {
  ExamAnswerMarker,
  type IMark,
  type IPronunciationJudge,
} from '../../domain/services/exam-answer-marker';
import { ExamPrescriptionService } from '../../domain/services/exam-prescription.service';
import { ExamScoringService } from '../../domain/services/exam-scoring.service';
import { type IExamOutcome } from '../dto/exam-outcome';
import { type IExamWriteUnit } from '../ports/exam-write-unit';

export interface IExamSubmissionInput {
  readonly profile: LearnerProfile;
  readonly definition: ExamDefinition;
  readonly attempt: ExamAttempt;
  readonly questions: readonly ExamQuestion[];
  readonly answers: readonly ExamAnswer[];
  /** The learner's whole review queue, so a prescription updates in place. */
  readonly history: readonly ReviewItem[];
  readonly now: Date;
}

/**
 * Marking, scoring and acting on the result — once, for both callers.
 *
 * A learner pressing submit and the cron backstop finishing an abandoned
 * attempt are the same act with a different trigger, and writing them twice is
 * how the abandoned one comes to be scored by slightly different rules. That is
 * not hypothetical: a learner who walks away from a failed exam would get no
 * prescription, which is precisely the case rule 8 exists for.
 *
 * It accepts an attempt in either of two states, and the reason is 009. The
 * database's own `pg_cron` job moves an expired attempt to `submitted` without
 * grading it — deliberately, because "the deadline passed" is not a grade and
 * scoring belongs to the engine — so the backstop meets attempts that are
 * already handed in and only need marking.
 */
export class ExamSubmissionService {
  private readonly scoring = new ExamScoringService();
  private readonly prescriptions = new ExamPrescriptionService();
  private readonly marker: ExamAnswerMarker;

  constructor(
    judge: IPronunciationJudge,
    private readonly policy: IReviewSchedulingPolicy,
    private readonly ids: IIdGenerator,
    private readonly writes: IExamWriteUnit,
  ) {
    this.marker = new ExamAnswerMarker(judge);
  }

  async submit(input: IExamSubmissionInput): Promise<IExamOutcome> {
    const { attempt, definition, profile, now } = input;

    const savedByQuestion = new Map(input.answers.map((answer) => [answer.questionId, answer]));
    const marks = new Map<string, IMark>();
    const marked: ExamAnswer[] = [];

    for (const question of input.questions) {
      const answer = savedByQuestion.get(question.id) ?? null;
      const mark = await this.marker.mark(question, answer);

      marks.set(question.id, mark);

      // Only rows that exist are updated. A question nobody answered has no
      // row, and inventing a blank at submission would make "unanswered" and
      // "answered wrongly" indistinguishable on the review screen.
      if (answer !== null) {
        marked.push(answer.marked(mark.isCorrect, mark.awardedPoints));
      }
    }

    const score = this.scoring.score(definition, input.questions, marked);

    // Already `submitted` when 009's pg_cron job got there first; still
    // `in_progress` when the learner pressed the button.
    const handedIn = attempt.status === 'in_progress' ? attempt.submit(now) : attempt;
    const graded = handedIn.grade(score.scorePercent, score.sectionScores, score.passed);

    // Rule 8. A pass prescribes nothing — the learner has demonstrated the
    // block, and sending them drills would contradict the result they just got.
    const prescription = score.passed
      ? []
      : this.prescriptions.prescribe({
          profileId: profile.id,
          questions: input.questions,
          marks,
          existing: input.history,
          now,
          localDay: LocalDate.fromInstant(now, profile.timezone),
          timezone: profile.timezone,
          policy: this.policy,
          newId: () => this.ids.next(),
        });

    // Rule 7. Only a graded pass moves anybody, and only forwards: somebody
    // already past the unlock day would be sent backwards by a naive
    // assignment. 016 guards that in SQL as well.
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
