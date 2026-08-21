import { type LearnerProfile } from '../../domain/entities/learner-profile';
import { type UserRole } from '../../domain/value-objects/user-role';

/**
 * One person, as the admin roster shows them.
 *
 * Deliberately not the whole profile. The timezone, the playback rate and the
 * accent are the learner's own settings, and an admin screen that displayed
 * them would be reading over their shoulder for no purpose the feature has.
 * What is here is what the roster is *for*: who this is, what they may do, and
 * how far through the programme they are.
 *
 * `startedAt` is an ISO string rather than a `Date` because this crosses into a
 * Server Component's props, and a `Date` does not survive that boundary intact.
 */
export interface IUserSummary {
  readonly profileId: string;
  readonly userId: string;
  readonly displayName: string;
  /** Null for a profile that predates 020 whose owner has not signed in since. */
  readonly email: string | null;
  readonly role: UserRole;
  readonly track: 'standard28' | 'sprint21';
  readonly currentDayIndex: number;
  readonly totalDays: number;
  readonly hasOnboarded: boolean;
  readonly startedAt: string;
  /**
   * Whether this row is the admin who is looking at it.
   *
   * Resolved here rather than compared in the browser: the client has no
   * trustworthy notion of who it is, and "do not offer me a button that would
   * lock me out of this screen" is a decision about the request.
   */
  readonly isSelf: boolean;
}

export interface IUserRoster {
  readonly users: readonly IUserSummary[];
  readonly totalUsers: number;
  readonly totalAdmins: number;
}

/**
 * The one mapping, shared by the two use cases that produce this shape.
 *
 * Written once because `SetUserRole` returns the row it just changed and the
 * roster returns every row, and a screen that merged a differently-shaped
 * "updated user" into its list would be a bug nobody sees until the third
 * field.
 */
export function toUserSummary(profile: LearnerProfile, callerProfileId: string): IUserSummary {
  return {
    profileId: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    email: profile.email,
    role: profile.role,
    track: profile.track,
    currentDayIndex: profile.currentDayIndex.value,
    totalDays: profile.totalDays(),
    hasOnboarded: profile.hasOnboarded(),
    startedAt: profile.startedAt.toISOString(),
    isSelf: profile.id === callerProfileId,
  };
}
