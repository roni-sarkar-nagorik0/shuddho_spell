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
import { type ILessonWriteUnit } from '../ports/lesson-write-unit';
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
 *
 * All of it lands in **one Postgres function** (013). Four separate writes over
 * PostgREST are four transactions, and a failure between them corrupts a
 * learner's history in a way nothing later can detect.
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
    private readonly writes: ILessonWriteUnit,
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

    const attempt = new Attempt({
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
    });

    const existing = await this.reviews.findByItem(profile.id, sentence.id);

    const reviewItem = (
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
    ).recordResult(isCorrect, now, localDay, this.policy, errorTags, profile.timezone);

    const mastery =
      sentence.grammarRuleFamilyIds.length === 0
        ? []
        : this.mastery.apply(
            await this.masteryRecords.findByProfile(profile.id),
            sentence.grammarRuleFamilyIds.map((id) => ({
              dimension: 'rule_family' as const,
              dimensionId: id,
              isCorrect,
            })),
            now,
            () => this.ids.next(),
            profile.id,
          );

    await this.writes.recordAttempt({ attempt, reviewItem, mastery });

    return {
      attemptId: attempt.id,
      isCorrect,
      score: attempt.score.value,
      errorTags,
      // The target rendering, not the learner's nearest accepted alternative:
      // showing "the" answer keeps the feedback one sentence rather than a
      // list, and the alternatives exist to accept input, not to teach.
      correctValue: isCorrect ? null : sentence.englishText,
      itemsTotal: session.itemsTotal + 1,
      itemsCorrect: session.itemsCorrect + (isCorrect ? 1 : 0),
    };
  }
}
