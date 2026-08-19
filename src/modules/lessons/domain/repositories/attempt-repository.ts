import { type Attempt } from '../entities/attempt';

export const ATTEMPT_REPOSITORY = Symbol('ATTEMPT_REPOSITORY');

export interface IAttemptRepository {
  /**
   * Append only. There is no `save` and no `delete` on this port, and that is
   * the point — 003 gives the client neither, and a repository offering an
   * update would be a way around a rule the database is enforcing.
   */
  readonly append: (attempt: Attempt) => Promise<Attempt>;

  readonly findBySession: (sessionId: string) => Promise<readonly Attempt[]>;

  /** For the progress screen: what this learner has done, newest first. */
  readonly findByProfile: (profileId: string, limit: number) => Promise<readonly Attempt[]>;
}
