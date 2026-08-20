import { type LearnerProfile } from '@/modules/auth/domain/entities/learner-profile';
import { Certificate } from '@/modules/certificates/domain/entities/certificate';
import { type ICertificateRepository } from '@/modules/certificates/domain/repositories/certificate-repository';
import { VerificationCode } from '@/modules/certificates/domain/value-objects/verification-code';
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
    private readonly certificates: ICertificateRepository,
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

    await this.issueCertificateIfEarned(graded, definition, profile, now);

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

  /**
   * A passed **final** earns a certificate — here, not on the result screen.
   *
   * It sits inside the shared submission path rather than in
   * `SubmitExamAttemptUseCase` for the same reason marking does: a learner who
   * passes the final and lets the clock run out is finished by 009's cron
   * backstop, and a certificate issued only on the button would be a
   * qualification they earned and never received.
   *
   * Idempotent by lookup, and by 006's unique `exam_attempt_id` behind that. A
   * failure to issue is swallowed on purpose — the exam is marked, the position
   * has moved and the writes are committed. Throwing here would turn a
   * successfully passed final into an error page, and the certificate can be
   * re-issued from the same attempt at any time because nothing about it
   * depends on when it was asked for.
   */
  private async issueCertificateIfEarned(
    attempt: ExamAttempt,
    definition: ExamDefinition,
    profile: LearnerProfile,
    now: Date,
  ): Promise<void> {
    if (attempt.passed !== true || definition.code !== 'final') {
      return;
    }

    try {
      const existing = await this.certificates.findByAttempt(attempt.id);

      if (existing !== null) {
        return;
      }

      await this.certificates.create(
        new Certificate({
          id: this.ids.next(),
          profileId: profile.id,
          examAttemptId: attempt.id,
          verificationCode: VerificationCode.fromBytes(codeBytes(this.ids.next())),
          // Snapshotted, never joined later — 006's rule, so the document keeps
          // saying what it said on the day it was issued.
          learnerName: profile.displayName,
          track: profile.track,
          scorePercent: attempt.scorePercent?.value ?? 0,
          issuedAt: now,
          comparison: {},
          revokedAt: null,
          revokedReason: null,
        }),
      );
    } catch {
      // Deliberately silent. See the doc comment above.
    }
  }
}

/**
 * Bytes for a verification code, from a generated id.
 *
 * A UUID v4 carries far more entropy than the twelve alphabet positions need,
 * and folding by code point rather than parsing hex means a fake generator
 * returning `attempt-1` still yields a well-formed code instead of throwing
 * inside a submission.
 */
function codeBytes(id: string): Uint8Array {
  const source = id.repeat(Math.ceil(24 / Math.max(1, id.length)));

  return Uint8Array.from(
    Array.from(source).slice(0, 24).map((character) => (character.codePointAt(0) ?? 0) % 256),
  );
}
