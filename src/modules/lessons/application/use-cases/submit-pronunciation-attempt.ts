import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { type IWordPhonemeRepository } from '@/modules/library/domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { IpaSegmenter } from '@/modules/library/domain/services/ipa-segmenter';
import { WordPhonemeResolver } from '@/modules/library/domain/services/word-phoneme-resolver';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import {
  MasteryCalculator,
  type IMasteryObservation,
} from '@/modules/progress/domain/services/mastery-calculator';
import { ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import {
  type IPronunciationDiagnosis,
  type ISpeechScorer,
  type ISpokenForm,
} from '@/modules/shared/application/ports/speech-scorer';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { ScorePercent } from '@/modules/shared/domain/value-objects/score-percent';
import { NAMED_NEAR_MISS_CEILING } from '@/modules/speech/domain/services/pronunciation-blend';
import { Attempt } from '../../domain/entities/attempt';
import { ItemNotInLessonError } from '../../domain/errors/item-not-in-lesson.error';
import { SessionNotFoundError } from '../../domain/errors/session-not-found.error';
import { type ILessonRepository } from '../../domain/repositories/lesson-repository';
import { type ILessonWriteUnit } from '../ports/lesson-write-unit';
import { type IAttemptResult } from '../dto/attempt-result';

/**
 * The sounds whose confusion already has a name in 003's nine-tag allowlist.
 *
 * Only /v/ and /w/ do. The other confusions are real errors with no tag and
 * they get none: inventing `TH_SUBSTITUTION` here would fail
 * `attempts_error_tags_known` at insert time — a runtime failure for a value
 * that could have been caught at build time. A tag arrives when a migration
 * adds it, not when a scorer wants one.
 *
 * Keyed by the **sound**, because a diagnosis carries no id. That is
 * deliberate: an id is an internal name for a row and a learner is shown a fix.
 */
const TAG_BY_SOUND: Readonly<Record<string, ErrorTag>> = Object.freeze({
  v: 'V_W_SUBSTITUTION',
  w: 'V_W_SUBSTITUTION',
});

export interface ISubmitPronunciationAttemptInput {
  readonly userId: string;
  readonly sessionId: string;
  readonly wordId: string;
  /**
   * What the browser's recogniser wrote down. **Text, and only ever text** —
   * `07-speech-scoring.md` makes it a hard constraint that the server receives
   * no audio, and the shape of this input is where that is either true or not.
   */
  readonly transcript: string;
  /** An observed pronunciation, when the client could produce one. Usually null. */
  readonly heardPhonemes: ISpokenForm | null;
  readonly latencyMs: number | null;
}

/**
 * A word said aloud, marked and filed.
 *
 * The shape follows `SubmitDictationAttempt` deliberately — same ownership
 * checks, same day-membership check, same one-transaction write — and differs
 * in the one place it must: **this is the attempt that writes the phoneme axis
 * of the mastery matrix.** Dictation credits rule families only, and correctly
 * so: spelling `very` right proves nothing about saying it. Until this use case
 * existed, half of `MasteryMatrix` had no source of data at all.
 *
 * The score is not a boolean and the row it writes is not either. A learner who
 * put /w/ where /v/ belonged scores in the sixties or eighties, is told which
 * lip position to move, and loses credit on **that phoneme alone** — every
 * other sound in the word was right and the matrix says so.
 */
export class SubmitPronunciationAttemptUseCase {
  private readonly mastery = new MasteryCalculator();

  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly lessons: ILessonRepository,
    private readonly program: IProgramRepository,
    private readonly words: IWordRepository,
    private readonly wordPhonemes: IWordPhonemeRepository,
    private readonly phonemes: IPhonemeRepository,
    private readonly reviews: IReviewItemRepository,
    private readonly masteryRecords: IMasteryRepository,
    private readonly scorer: ISpeechScorer,
    private readonly policy: IReviewSchedulingPolicy,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
    private readonly writes: ILessonWriteUnit,
  ) {}

  async execute(input: ISubmitPronunciationAttemptInput): Promise<IAttemptResult> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const session = await this.lessons.findById(input.sessionId);

    if (session === null || session.profileId !== profile.id) {
      throw new SessionNotFoundError(input.sessionId);
    }

    const day = await this.program.findDay(profile.track, session.dayIndex);

    if (day === null || !day.wordIds().includes(input.wordId)) {
      throw new ItemNotInLessonError(input.wordId, session.dayIndex.value);
    }

    const word = await this.words.findById(input.wordId);

    if (word === null) {
      throw new ItemNotInLessonError(input.wordId, session.dayIndex.value);
    }

    // The stored G2P, both halves of it: the transcription decides the sounds
    // and their stress, the join table decides which phoneme row each one is.
    const [links, inventory] = await Promise.all([
      this.wordPhonemes.findByWordIds([word.id]),
      this.phonemes.listAll(),
    ]);

    const sequence = new WordPhonemeResolver(IpaSegmenter.fromPhonemes(inventory)).resolve(
      word,
      links,
    );

    const score = this.scorer.score({
      expectedText: word.text,
      expected: { phonemes: sequence.symbols(), stressIndex: sequence.stressedPosition() },
      heardTranscript: input.transcript,
      heard: input.heardPhonemes,
    });

    // Above the near-miss ceiling there is no named error left, which is what
    // the ceiling means — so this needs no threshold of its own beside it.
    const isCorrect =
      score.diagnoses.length === 0 && score.scorePercent > NAMED_NEAR_MISS_CEILING;

    const errorTags = tagsFor(score.diagnoses);

    const now = this.clock.now();
    const localDay = LocalDate.fromInstant(now, profile.timezone);

    const attempt = new Attempt({
      id: this.ids.next(),
      sessionId: session.id,
      profileId: profile.id,
      itemType: 'word',
      itemId: word.id,
      mode: 'pronunciation',
      // The transcript, which is all the server was ever sent.
      submittedValue: input.transcript,
      isCorrect,
      score: ScorePercent.of(score.scorePercent),
      errorTags,
      latencyMs: input.latencyMs,
      createdAt: now,
    });

    const existing = await this.reviews.findByItem(profile.id, word.id);

    const reviewItem = (
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
    ).recordResult(isCorrect, now, localDay, this.policy, errorTags, profile.timezone);

    // `perPhoneme` is one entry per expected sound in the word's own order, so
    // it lines up with the sequence position for position. Partial credit is a
    // miss here: the learner produced a nameable wrong sound, and a matrix cell
    // that counted it correct would hide the exact gap this product exists for.
    const observations: readonly IMasteryObservation[] = score.perPhoneme.flatMap(
      (phoneme, index) => {
        const phonemeId = sequence.slots[index]?.phonemeId ?? null;

        return phonemeId === null
          ? []
          : [{ dimension: 'phoneme', dimensionId: phonemeId, isCorrect: phoneme.credit === 1 }];
      },
    );

    const mastery = this.mastery.apply(
      await this.masteryRecords.findByProfile(profile.id),
      observations,
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
      correctValue: isCorrect ? null : word.text,
      itemsTotal: session.itemsTotal + 1,
      itemsCorrect: session.itemsCorrect + (isCorrect ? 1 : 0),
    };
  }
}

/** Diagnoses turned into the tags 003 already knows, and nothing else. */
function tagsFor(diagnoses: readonly IPronunciationDiagnosis[]): readonly ErrorTag[] {
  const tags = new Set<ErrorTag>();

  for (const diagnosis of diagnoses) {
    const tag = TAG_BY_SOUND[diagnosis.expected];

    if (tag !== undefined) {
      tags.add(tag);
    }
  }

  return [...tags];
}
