import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ErrorTagger } from '@/modules/library/domain/services/error-tagger';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { MasteryCalculator } from '@/modules/progress/domain/services/mastery-calculator';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
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

export interface ISubmitDictationAttemptInput {
  readonly userId: string;
  readonly sessionId: string;
  readonly wordId: string;
  readonly submittedValue: string;
  readonly latencyMs: number | null;
}

/** Dictation is spelled or it is not — there is no partial credit to give. */
const FULL_MARKS = 100;
const NO_MARKS = 0;

/**
 * A word spelled from audio, marked and filed.
 *
 * Everything that follows from one answer happens here and happens together:
 * the attempt is recorded, the session's counters move, the review queue is
 * updated, and the rule family the word demonstrates gains a data point. Doing
 * any of it later — at the end of the lesson, in a cron job — means a learner
 * who abandons the lesson loses the work they actually did.
 */
export class SubmitDictationAttemptUseCase {
  private readonly mastery = new MasteryCalculator();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
    private readonly program: IProgramRepository,
    private readonly words: IWordRepository,
    private readonly attempts: IAttemptRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly masteryRecords: IMasteryRepository,
    private readonly tagger: ErrorTagger,
    private readonly policy: IReviewSchedulingPolicy,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: ISubmitDictationAttemptInput): Promise<IAttemptResult> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const session = await this.lessons.findById(input.sessionId);

    if (session === null || session.profileId !== profile.id) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const day = await this.program.findDay(profile.track, session.dayIndex);

    // The item id comes from the request body, so any client can send any id.
    // Without this a learner could grind one easy word to mastery, or answer
    // day 27's vocabulary on day 2 and skew every number they have.
    if (day === null || !day.wordIds().includes(input.wordId)) {
      throw new ItemNotInLessonError(input.wordId, session.dayIndex.value);
    }

    const word = await this.words.findById(input.wordId);

    if (word === null) {
      throw new ItemNotInLessonError(input.wordId, session.dayIndex.value);
    }

    const isCorrect = word.matches(input.submittedValue);
    const errorTags: readonly ErrorTag[] = isCorrect
      ? []
      : this.tagger.tagSpelling(word.text, input.submittedValue);

    const now = this.clock.now();
    const localDay = LocalDate.fromInstant(now, profile.timezone);

    return this.unitOfWork.run(async () => {
      const attempt = await this.attempts.append(
        new Attempt({
          id: this.ids.next(),
          sessionId: session.id,
          profileId: profile.id,
          itemType: 'word',
          itemId: word.id,
          mode: 'dictation',
          submittedValue: input.submittedValue,
          isCorrect,
          score: ScorePercent.of(isCorrect ? FULL_MARKS : NO_MARKS),
          errorTags,
          latencyMs: input.latencyMs,
          createdAt: now,
        }),
      );

      const updated = await this.lessons.save(session.recordItemResult(isCorrect));

      const existing = await this.reviews.findByItem(profile.id, word.id);

      await this.reviews.upsert(
        (
          existing ??
          new ReviewItem({
            id: this.ids.next(),
            profileId: profile.id,
            itemId: word.id,
            itemType: 'word',
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

      // Spelling evidence, so the rule family only. A learner who spells "very"
      // correctly has demonstrated nothing about saying it, and crediting the
      // phonemes here would make the pronunciation half of the matrix a lie.
      const ruleFamilyId = word.ruleFamilyId;

      if (ruleFamilyId !== null) {
        const records = await this.masteryRecords.findByProfile(profile.id);

        await this.masteryRecords.saveMany(
          this.mastery.apply(
            records,
            [{ dimension: 'rule_family', dimensionId: ruleFamilyId, isCorrect }],
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
        correctValue: isCorrect ? null : word.text,
        itemsTotal: updated.itemsTotal,
        itemsCorrect: updated.itemsCorrect,
      };
    });
  }
}
