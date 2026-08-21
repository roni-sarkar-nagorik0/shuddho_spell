import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { type IClock } from '@/modules/shared/application/ports/clock';
import { type IIdGenerator } from '@/modules/shared/application/ports/id-generator';
import { MissingReferenceError } from '@/modules/shared/domain/errors/missing-reference.error';
import { DemoAttempt } from '../../domain/entities/demo-attempt';
import { type IDemoAttemptRepository } from '../../domain/repositories/demo-attempt-repository';

export interface IRecordDemoAttemptInput {
  /** From the verified session. The body never names who is practising. */
  readonly userId: string;
  readonly wordId: string;
  /** What was typed, exactly. Whether it is right is not the caller's to say. */
  readonly submittedValue: string;
}

export interface IRecordDemoAttemptOutput {
  readonly attemptId: string;
  readonly isCorrect: boolean;
}

/**
 * Records one demo answer for a signed-in learner.
 *
 * **The server decides whether it was right.** The client posts the word id and
 * the letters typed; this loads the word and asks `Word.matches`. That is not
 * ceremony — `CLAUDE.md` bans client-trusted score outright, and an endpoint
 * that accepted `isCorrect: true` would let anybody's dashboard report a
 * thousand perfect words. The demo still marks itself in the browser for the
 * visitor's benefit, and that display has no bearing on what is stored.
 *
 * Anonymous visitors never reach this: the route requires a session, and 021's
 * `profile_id` is `not null`. Nobody is recorded who has not signed in.
 */
export class RecordDemoAttemptUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly words: IWordRepository,
    private readonly attempts: IDemoAttemptRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(input: IRecordDemoAttemptInput): Promise<IRecordDemoAttemptOutput> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const word = await this.words.findById(input.wordId);

    if (word === null) {
      throw new MissingReferenceError('Word', input.wordId);
    }

    const isCorrect = word.matches(input.submittedValue);

    const stored = await this.attempts.append(
      new DemoAttempt({
        id: this.ids.next(),
        profileId: profile.id,
        wordId: word.id,
        submittedValue: input.submittedValue,
        isCorrect,
        createdAt: this.clock.now(),
      }),
    );

    return { attemptId: stored.id, isCorrect };
  }
}
