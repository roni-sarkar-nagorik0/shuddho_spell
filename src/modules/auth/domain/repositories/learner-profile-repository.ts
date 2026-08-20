import { type LearnerProfile } from '../entities/learner-profile';
import { type UserRole } from '../value-objects/user-role';

export const LEARNER_PROFILE_REPOSITORY = Symbol('LEARNER_PROFILE_REPOSITORY');

export interface INewLearnerProfile {
  readonly userId: string;
  readonly displayName: string;
  /**
   * The address on the session that is creating this profile. Null when there
   * is none to be had, which Google does not do — the type says so because the
   * column does.
   */
  readonly email: string | null;
}

export interface ILearnerProfileRepository {
  readonly findByUserId: (userId: string) => Promise<LearnerProfile | null>;

  /**
   * By profile id rather than by session.
   *
   * The scheduled paths need this and no request path does: a cron job holds a
   * row that names a `profile_id` and there is nobody signed in to resolve it
   * from. Every learner-facing use case still starts at `findByUserId`, which
   * is why identity there can only ever come from the verified session.
   */
  readonly findById: (id: string) => Promise<LearnerProfile | null>;

  /**
   * Every learner, capped.
   *
   * The hourly notification job's only read, and the only thing in the
   * application that walks the whole table. It is a deliberate compromise:
   * the *right* query is "learners whose `reminder_time` hour equals the
   * current hour **in their own timezone**", and that is
   * `(now() at time zone timezone)::time`, which `IDatabase` cannot express and
   * which no repository seam of this shape ever will. Rather than widen the
   * seam for one caller, the job reads the roster and decides per learner in
   * the domain, where the rule is testable.
   *
   * The cap is what stops that being unbounded. When it starts to bite, the
   * answer is a Postgres function like 013's, not a bigger number.
   */
  readonly listAll: (limit: number) => Promise<readonly LearnerProfile[]>;

  /**
   * How many people hold a role.
   *
   * One caller and one reason: `SetUserRoleUseCase` refuses to demote the last
   * admin, and it cannot know that from the profile in front of it. A count
   * rather than a list because the answer is a number — reading every admin row
   * to call `.length` on it would be the same question asked expensively.
   */
  readonly countByRole: (role: UserRole) => Promise<number>;

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
