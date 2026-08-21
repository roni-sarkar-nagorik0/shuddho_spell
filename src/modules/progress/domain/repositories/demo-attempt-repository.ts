import { type DemoAttempt } from '../entities/demo-attempt';

export const DEMO_ATTEMPT_REPOSITORY = Symbol('DEMO_ATTEMPT_REPOSITORY');

export interface IDemoAttemptRepository {
  /**
   * Append only, like `IAttemptRepository`. No `save`, no `delete` — 021 gives
   * the client neither, and a repository offering an update would be a way
   * around a rule the database is enforcing.
   */
  readonly append: (attempt: DemoAttempt) => Promise<DemoAttempt>;

  /**
   * Everything this learner tried since an instant, newest first.
   *
   * The instant is the **learner-local** day boundary, resolved by the caller
   * from their timezone — the server's midnight is not theirs, and the whole
   * point of the figure is "today" as they experienced it.
   *
   * Capped, because a dashboard panel is not a log viewer and an uncapped read
   * is how one learner's enthusiastic afternoon becomes everybody's slow page.
   */
  readonly findSince: (
    profileId: string,
    since: Date,
    limit: number,
  ) => Promise<readonly DemoAttempt[]>;
}
