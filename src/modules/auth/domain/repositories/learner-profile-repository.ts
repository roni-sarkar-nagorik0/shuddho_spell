import { type LearnerProfile } from '../entities/learner-profile';

export const LEARNER_PROFILE_REPOSITORY = Symbol('LEARNER_PROFILE_REPOSITORY');

export interface INewLearnerProfile {
  readonly userId: string;
  readonly displayName: string;
}

export interface ILearnerProfileRepository {
  readonly findByUserId: (userId: string) => Promise<LearnerProfile | null>;

  /**
   * Creates the profile if this user has none, and returns the profile either
   * way — the one that already existed, or the one this call made.
   *
   * **Atomic, not read-then-write.** Two first requests can arrive at once: a
   * page load and its own prefetch are enough. An implementation that checks
   * then inserts has a window between the two, and the loser of that race gets
   * a unique-violation 500 on the first screen a learner ever sees. The
   * database has to be the thing that decides, and the caller has to be able to
   * run this twice with the same result.
   */
  readonly insertIfAbsent: (profile: INewLearnerProfile) => Promise<LearnerProfile>;

  /**
   * Writes a changed profile back.
   *
   * Added in F4.12 — completing a day advances `current_day_index`, and until
   * now nothing in the application had a reason to change a profile at all.
   * Whole-entity rather than a field patch: the entity is what enforces "never
   * past the end of the track", and a `setCurrentDay(n)` would let a caller
   * skip it.
   */
  readonly save: (profile: LearnerProfile) => Promise<LearnerProfile>;
}
