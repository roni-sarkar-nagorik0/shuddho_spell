import 'server-only';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { SupabaseLearnerProfileRepository } from '@/modules/auth/infrastructure/persistence/supabase/learner-profile.repository';
import { type IAttemptRepository } from '@/modules/lessons/domain/repositories/attempt-repository';
import { type ILessonRepository } from '@/modules/lessons/domain/repositories/lesson-repository';
import { SupabaseAttemptRepository } from '@/modules/lessons/infrastructure/persistence/supabase/attempt.repository';
import { SupabaseLessonRepository } from '@/modules/lessons/infrastructure/persistence/supabase/lesson.repository';
import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordPhonemeRepository } from '@/modules/library/domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { ErrorTagger } from '@/modules/library/domain/services/error-tagger';
import { SupabasePhonemeRepository } from '@/modules/library/infrastructure/persistence/supabase/phoneme.repository';
import { SupabaseRuleFamilyRepository } from '@/modules/library/infrastructure/persistence/supabase/rule-family.repository';
import { SupabaseSentenceItemRepository } from '@/modules/library/infrastructure/persistence/supabase/sentence-item.repository';
import { SupabaseWordPhonemeRepository } from '@/modules/library/infrastructure/persistence/supabase/word-phoneme.repository';
import { SupabaseWordRepository } from '@/modules/library/infrastructure/persistence/supabase/word.repository';
import { type IProgramRepository } from '@/modules/program/domain/repositories/program-repository';
import { SupabaseProgramRepository } from '@/modules/program/infrastructure/persistence/supabase/program.repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { type IStreakRepository } from '@/modules/progress/domain/repositories/streak-repository';
import { SupabaseMasteryRepository } from '@/modules/progress/infrastructure/persistence/supabase/mastery.repository';
import { SupabaseStreakRepository } from '@/modules/progress/infrastructure/persistence/supabase/streak.repository';
import { type IReviewItemRepository } from '@/modules/review/domain/repositories/review-item-repository';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { IntervalLadderPolicy } from '@/modules/review/domain/services/interval-ladder.policy';
import { SupabaseReviewItemRepository } from '@/modules/review/infrastructure/persistence/supabase/review-item.repository';
import { type ILessonWriteUnit } from '@/modules/lessons/application/ports/lesson-write-unit';
import { SupabaseLessonWriteUnit } from '@/modules/lessons/infrastructure/adapters/supabase-lesson-write-unit';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { SystemClock } from '@/modules/shared/infrastructure/adapters/system-clock';
import { UuidGenerator } from '@/modules/shared/infrastructure/adapters/uuid-generator';
import { RetryingDatabase } from '@/modules/shared/infrastructure/persistence/retrying-database';
import { toDatabase } from '@/modules/shared/infrastructure/persistence/supabase-database';

/**
 * The composition root — plain construction, no DI framework, no decorators.
 * One container per request; nothing here is cached across requests, because a
 * request-scoped client must not outlive its cookies.
 *
 * This is the only file that knows which implementation is behind a port. A use
 * case never reaches into it — the test for whether that holds is that every
 * use case is buildable with fakes and nothing else.
 */
export interface IContainer {
  readonly requestId: string;

  readonly learnerProfiles: ILearnerProfileRepository;
  readonly words: IWordRepository;
  /** The stored G2P — 002's `word_phonemes`, read at last. */
  readonly wordPhonemes: IWordPhonemeRepository;
  readonly sentenceItems: ISentenceItemRepository;
  readonly ruleFamilies: IRuleFamilyRepository;
  readonly phonemes: IPhonemeRepository;
  readonly program: IProgramRepository;
  readonly lessons: ILessonRepository;
  readonly attempts: IAttemptRepository;
  readonly reviewItems: IReviewItemRepository;
  readonly mastery: IMasteryRepository;
  readonly streaks: IStreakRepository;

  /**
   * Domain services. Stateless and pure, so one instance per request costs
   * nothing and keeps the rule that a use case is handed what it needs rather
   * than constructing it.
   */
  readonly reviewPolicy: IReviewSchedulingPolicy;
  readonly errorTagger: ErrorTagger;

  /** The writes that must not half-happen — 013 and 014's Postgres functions. */
  readonly lessonWrites: ILessonWriteUnit;

  readonly clock: IClock;
  readonly ids: IIdGenerator;
}

export function createContainer(requestId: string): IContainer {
  // One database handle for every repository in the request. The service
  // client, because 008 gives the learner's own no insert policy on
  // `learner_profiles` and the use cases filter by `profile_id` explicitly.
  //
  // Wrapped so a serialization failure is retried once and the three Postgres
  // codes `03-database.md` names arrive as typed domain errors rather than as
  // messages a caller would have to string-match.
  const db = new RetryingDatabase(toDatabase());

  return {
    requestId,

    learnerProfiles: new SupabaseLearnerProfileRepository(db),
    words: new SupabaseWordRepository(db),
    wordPhonemes: new SupabaseWordPhonemeRepository(db),
    sentenceItems: new SupabaseSentenceItemRepository(db),
    ruleFamilies: new SupabaseRuleFamilyRepository(db),
    phonemes: new SupabasePhonemeRepository(db),
    program: new SupabaseProgramRepository(db),
    lessons: new SupabaseLessonRepository(db),
    attempts: new SupabaseAttemptRepository(db),
    reviewItems: new SupabaseReviewItemRepository(db),
    mastery: new SupabaseMasteryRepository(db),
    streaks: new SupabaseStreakRepository(db),

    reviewPolicy: new IntervalLadderPolicy(),
    errorTagger: new ErrorTagger(),

    lessonWrites: new SupabaseLessonWriteUnit(db),

    clock: new SystemClock(),
    ids: new UuidGenerator(),
  };
}
