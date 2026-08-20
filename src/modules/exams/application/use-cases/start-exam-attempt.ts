import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { ExamAttempt } from '../../domain/entities/exam-attempt';
import { type ExamDefinition } from '../../domain/entities/exam-definition';
import { ExamQuestion } from '../../domain/entities/exam-question';
import { ExamAttemptsExhaustedError } from '../../domain/errors/exam-attempts-exhausted.error';
import { ExamCooldownActiveError } from '../../domain/errors/exam-cooldown-active.error';
import { ExamLockedError } from '../../domain/errors/exam-locked.error';
import { ExamNotFoundError } from '../../domain/errors/exam-not-found.error';
import { type IExamAnswerRepository } from '../../domain/repositories/exam-answer-repository';
import { type IExamAttemptRepository } from '../../domain/repositories/exam-attempt-repository';
import { type IExamDefinitionRepository } from '../../domain/repositories/exam-definition-repository';
import { type IExamQuestionRepository } from '../../domain/repositories/exam-question-repository';
import { ExamBlueprintService } from '../../domain/services/exam-blueprint.service';
import { ExamCandidateBuilder } from '../../domain/services/exam-candidate-builder';
import { ExamEligibilityPolicy } from '../../domain/services/exam-eligibility.policy';
import { type ExamCode } from '../../domain/value-objects/exam-code';
import { type IExamAttemptView } from '../dto/exam-attempt-view';
import { buildExamAttemptView } from '../services/exam-attempt-view';
import { type IExamWriteUnit } from '../ports/exam-write-unit';

/** 560 sentence items exist in a finished course; this reads them once. */
const SENTENCE_POOL_LIMIT = 1000;

export interface IStartExamAttemptInput {
  readonly userId: string;
  readonly code: ExamCode;
}

/**
 * Begins an exam, or hands back the one already running.
 *
 * **The deadline is set once** — rule 1, and this is the use case that has to
 * mean it. A learner who refreshes, reconnects, or opens a second tab does not
 * get a new attempt and does not get more time: an existing `in_progress`
 * attempt is *returned*, read from the database exactly as it was stored, with
 * `remainingSeconds` recomputed from the stored deadline and the server's
 * clock. Nothing in this method can write `serverDeadlineAt` on that path,
 * because the only thing that writes it is `ExamAttempt.start()` and that is
 * not called.
 *
 * The paper and the attempt row are written by **one Postgres function** (015).
 * An attempt row without its questions is unanswerable and, thanks to the
 * one-live-attempt index, would block the learner from ever sitting that exam
 * again — the worst outcome available from a dropped connection.
 */
export class StartExamAttemptUseCase {
  private readonly blueprint = new ExamBlueprintService();
  private readonly candidates = new ExamCandidateBuilder();
  private readonly eligibility = new ExamEligibilityPolicy();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly definitions: IExamDefinitionRepository,
    private readonly attempts: IExamAttemptRepository,
    private readonly questions: IExamQuestionRepository,
    private readonly answers: IExamAnswerRepository,
    private readonly words: IWordRepository,
    private readonly sentences: ISentenceItemRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly writes: IExamWriteUnit,
  ) {}

  async execute(input: IStartExamAttemptInput): Promise<IExamAttemptView> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const definition = await this.definitions.findByCode(input.code);

    if (definition === null) {
      throw new ExamNotFoundError(input.code);
    }

    const unlocksOn = definition.unlockDayFor(profile.track);

    if (profile.currentDayIndex.value < unlocksOn) {
      throw new ExamLockedError(input.code, unlocksOn, profile.currentDayIndex.value);
    }

    const now = this.clock.now();
    const existing = await this.attempts.findActive(profile.id, definition.id);

    // The resume path. It reads and it does not write, which is the whole
    // guarantee: there is no code here that could extend a deadline.
    if (existing !== null) {
      return this.view(definition, existing, now);
    }

    // Only now, after the resume path has been ruled out. Checking eligibility
    // first would refuse a learner their own live attempt on the third try at
    // an exam that allows three — they are not starting a fourth, they are
    // coming back to the one they are sitting.
    const verdict = this.eligibility.evaluate(
      definition,
      await this.attempts.findForExam(profile.id, definition.id),
      now,
    );

    if (verdict.kind === 'exhausted') {
      throw new ExamAttemptsExhaustedError(definition.code, verdict.maxAttempts);
    }

    if (verdict.kind === 'cooling_down') {
      throw new ExamCooldownActiveError(
        definition.code,
        verdict.remainingSeconds,
        verdict.retryAt,
      );
    }

    const attemptId = this.ids.next();

    // Generated once, used for the selection **and** stored on the attempt.
    // Two different values here would make `seed` a decoration: the column
    // would not rebuild the paper it claims to.
    const seed = this.ids.next();

    // Three independent reads, so three at once. They are the pool, the whole
    // pool and the learner's history over it, and none depends on another.
    const [words, sentences, history] = await Promise.all([
      this.words.findUpToWeek(definition.coverageWeeks(profile.track)),
      this.sentences.listAll(SENTENCE_POOL_LIMIT),
      this.reviews.findByProfile(profile.id),
    ]);

    const paper = this.blueprint.select(
      definition,
      seed,
      this.candidates.build(words, sentences, history),
    );

    const started = new ExamAttempt({
      id: attemptId,
      profileId: profile.id,
      definitionId: definition.id,
      // Provisional. 015 derives the real number under a row lock, because two
      // tabs starting at once would both compute the same one from a count.
      attemptNumber: 1,
      status: 'scheduled',
      startedAt: null,
      serverDeadlineAt: null,
      submittedAt: null,
      currentSectionIndex: 0,
      scorePercent: null,
      sectionScores: {},
      passed: null,
      seed,
    }).start(now, definition.durationSeconds);

    const written = await this.writes.startAttempt({
      attempt: started,
      questions: paper.map(
        (question) =>
          new ExamQuestion({
            id: this.ids.next(),
            attemptId,
            sectionCode: question.sectionCode,
            orderIndex: question.orderIndex,
            type: question.type,
            payload: question.payload,
            correctAnswer: question.correctAnswer,
            weight: question.weight,
          }),
      ),
    });

    const stored = await this.attempts.findById(written);

    if (stored === null) {
      throw new ExamNotFoundError(written);
    }

    return this.view(definition, stored, now);
  }

  /**
   * Start and resume return the **same** shape from the same builder. A resume
   * that reported the deadline differently from the start would cost a learner
   * time and would not be noticed until it did.
   */
  private async view(
    definition: ExamDefinition,
    attempt: ExamAttempt,
    now: Date,
  ): Promise<IExamAttemptView> {
    const [questions, answers] = await Promise.all([
      // The read that does not select `correct_answer` — rule 3.
      this.questions.findByAttemptForLearner(attempt.id),
      this.answers.findByAttempt(attempt.id),
    ]);

    return buildExamAttemptView({ definition, attempt, questions, answers, now });
  }
}
