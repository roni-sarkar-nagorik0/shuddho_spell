import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type ErrorTagger } from '@/modules/library/domain/services/error-tagger';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { MasteryCalculator } from '@/modules/progress/domain/services/mastery-calculator';
import { ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { type IUnitOfWork } from '@/modules/shared/application/ports/unit-of-work';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { Attempt } from '../../domain/entities/attempt';
import { ItemNotInLessonError } from '../../domain/errors/item-not-in-lesson.error';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';
import { type IAttemptRepository } from '../../domain/repositories/attempt-repository';
import { type ILessonRepository } from '../../domain/repositories/lesson-repository';
import { type IAttemptResult } from '../dto/attempt-result';

export interface ISubmitConstructionAttemptInput {
  readonly userId: string;
  readonly sessionId: string;
  readonly sentenceItemId: string;
  readonly submittedValue: string;
  readonly latencyMs: number | null;
}

const FULL_MARKS = 100;
const NO_MARKS = 0;

/**
 * A sentence built from a word bank, marked against every accepted rendering.
 *
 * The mastery credit fans out: one sentence can demonstrate several grammar
 * rules — an article, a preposition and a tense in one line — and each of them
 * gets a data point from the same answer. That fan-out is why
 * `MasteryCalculator.apply` takes a list rather than a single observation.
 */
export class SubmitConstructionAttemptUseCase {
  private readonly mastery = new MasteryCalculator();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
    private readonly program: IProgramRepository,
    private readonly sentences: ISentenceItemRepository,
    private readonly attempts: IAttemptRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly masteryRecords: IMasteryRepository,
    private readonly tagger: ErrorTagger,
    private readonly policy: IReviewSchedulingPolicy,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: ISubmitConstructionAttemptInput): Promise<IAttemptResult> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const session = await this.lessons.findById(input.sessionId);

    if (session === null || session.profileId !== profile.id) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const day = await this.program.findDay(profile.track, session.dayIndex);

    if (day === null || !day.sentenceItemIds().includes(input.sentenceItemId)) {
      throw new ItemNotInLessonError(input.sentenceItemId, session.dayIndex.value);
    }

    const sentence = await this.sentences.findById(input.sentenceItemId);

    if (sentence === null) {
      throw new ItemNotInLessonError(input.sentenceItemId, session.dayIndex.value);
    }

    const isCorrect = sentence.accepts(input.submittedValue);
    const errorTags: readonly ErrorTag[] = isCorrect
      ? []
      : this.tagger.tagSentence(sentence.englishText, input.submittedValue);

    const now = this.clock.now();
    const localDay = LocalDate.fromInstant(now, profile.timezone);

    return this.unitOfWork.run(async () => {
      const attempt = await this.attempts.append(
        new Attempt({
          id: this.ids.next(),
          sessionId: session.id,
          profileId: profile.id,
          itemType: 'sentence',
          itemId: sentence.id,
          mode: 'construction',
          submittedValue: input.submittedValue,
          isCorrect,
          score: ScorePercent.of(isCorrect ? FULL_MARKS : NO_MARKS),
          errorTags,
          latencyMs: input.latencyMs,
          createdAt: now,
        }),
      );

      const updated = await this.lessons.save(session.recordItemResult(isCorrect));

      const existing = await this.reviews.findByItem(profile.id, sentence.id);

      await this.reviews.upsert(
        (
          existing ??
          new ReviewItem({
            id: this.ids.next(),
            profileId: profile.id,
            itemId: sentence.id,
            itemType: 'sentence',
            intervalIndex: 0,
            dueAt: now,
            timesSeen: 0,
            timesCorrect: 0,
            consecutiveCorrect: 0,
            lastCorrectOn: null,
            isMastered: false,
            lastErrorTags: [],
          })
        ).recordResult(isCorrect, now, localDay, this.policy, errorTags, profile.timezone),
      );

      if (sentence.grammarRuleFamilyIds.length > 0) {
        const records = await this.masteryRecords.findByProfile(profile.id);

        await this.masteryRecords.saveMany(
          this.mastery.apply(
            records,
            sentence.grammarRuleFamilyIds.map((id) => ({
              dimension: 'rule_family' as const,
              dimensionId: id,
              isCorrect,
            })),
            now,
            () => this.ids.next(),
            profile.id,
          ),
        );
      }

      return {
        attemptId: attempt.id,
        isCorrect,
        score: attempt.score.value,
        errorTags,
        // The target rendering, not the learner's nearest accepted alternative:
        // showing "the" answer keeps the feedback one sentence rather than a
        // list, and the alternatives exist to accept input, not to teach.
        correctValue: isCorrect ? null : sentence.englishText,
        itemsTotal: updated.itemsTotal,
        itemsCorrect: updated.itemsCorrect,
      };
    });
  }
}
