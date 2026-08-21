import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { totalDaysIn, type Track } from '@/modules/shared/domain/value-objects/track';
import { type AccentPreference } from '../value-objects/accent-preference';
import { type UserRole } from '../value-objects/user-role';
import { type UiLanguage } from '../value-objects/ui-language';

/**
 * Named rather than positional, and that is the point of the shape.
 *
 * Phase 3 built this entity with six positional arguments and a note saying
 * grow it when there is something to grow it with. Phase 4 is that: streaks and
 * the mastery rule both need `timezone`, and the lesson player needs the
 * playback preferences. Eleven positional arguments — of which `track`,
 * `timezone`, `uiLanguage` and `accentPreference` are all strings — is a
 * transposition waiting to happen that the compiler could not catch.
 */
export interface ILearnerProfileProps {
  readonly id: string;
  /** The `auth.users` row this profile hangs off. */
  readonly userId: string;
  readonly displayName: string;
  /**
   * A copy of the address on the account, rewritten on every sign-in — 020.
   *
   * Null only for a profile made before that column existed by a user who has
   * not signed in since. Every learner-facing screen still reads the address
   * from the session; this one exists so the admin roster can name people it
   * has no session for.
   */
  readonly email: string | null;
  /** `user` unless this is the first account ever created, or an admin said so. */
  readonly role: UserRole;
  readonly track: Track;
  readonly dailyMinutes: number;
  readonly startedAt: Date;
  /**
   * IANA zone name. **Every** learner-facing day boundary is computed in this
   * zone: streaks, review due dates, and the "3 different calendar days"
   * mastery rule. The server's date is never the learner's.
   */
  readonly timezone: string;
  readonly uiLanguage: UiLanguage;
  readonly currentDayIndex: DayIndex;
  readonly accentPreference: AccentPreference;
  /** 0.50–1.50 of normal speed. */
  readonly playbackRate: number;
  /** Null until onboarding is finished — 011. */
  readonly onboardingCompletedAt: Date | null;
}

/**
 * What onboarding actually decides.
 *
 * The reminder time is **not** here on purpose: it lives in
 * `notification_preferences`, not on the profile, and 005 owns it. Copying it
 * onto the profile so one screen could write it in one call would create a
 * second home for the same fact.
 */
export interface IOnboardingChoices {
  readonly track: Track;
  readonly dailyMinutes: number;
  readonly accentPreference: AccentPreference;
}

/** The learner behind a session. */
export class LearnerProfile {
  readonly id: string;
  readonly userId: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly role: UserRole;
  readonly track: Track;
  readonly dailyMinutes: number;
  readonly startedAt: Date;
  readonly timezone: string;
  readonly uiLanguage: UiLanguage;
  readonly currentDayIndex: DayIndex;
  readonly accentPreference: AccentPreference;
  readonly playbackRate: number;
  readonly onboardingCompletedAt: Date | null;

  constructor(props: ILearnerProfileProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.displayName = props.displayName;
    this.email = props.email;
    this.role = props.role;
    this.track = props.track;
    this.dailyMinutes = props.dailyMinutes;
    this.startedAt = props.startedAt;
    this.timezone = props.timezone;
    this.uiLanguage = props.uiLanguage;
    this.currentDayIndex = props.currentDayIndex;
    this.accentPreference = props.accentPreference;
    this.playbackRate = props.playbackRate;
    this.onboardingCompletedAt = props.onboardingCompletedAt;
  }

  /**
   * What `/auth/callback` routes on. A behaviour rather than a null check at
   * the call site, because "has this learner been here before" is a question
   * about the learner.
   */
  hasOnboarded(): boolean {
    return this.onboardingCompletedAt !== null;
  }

  /**
   * The one question every admin-only use case asks first.
   *
   * A behaviour rather than `profile.role === 'admin'` at seven call sites: if
   * a third role is ever added, the places that meant "may see everybody" and
   * the places that meant "is exactly an admin" are already distinguishable.
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Promotion or demotion, returning a new instance like every other state
   * change here.
   *
   * The entity does not refuse a demotion: "this is the last admin" is a fact
   * about the whole table, and an entity that could see the whole table would
   * be a repository. `SetUserRoleUseCase` owns that rule.
   */
  withRole(role: UserRole): LearnerProfile {
    return new LearnerProfile({ ...this.toProps(), role });
  }

  /**
   * The address, refreshed from the session that just signed in.
   *
   * Returns `this` when nothing changed, so the reconciler that runs on every
   * sign-in can call it unconditionally and only writes when there is something
   * to write.
   */
  withEmail(email: string | null): LearnerProfile {
    return email === this.email ? this : new LearnerProfile({ ...this.toProps(), email });
  }

  /**
   * A position with no total is not a position. The track is what says whether
   * day 19 is nearly finished or two-thirds through.
   */
  totalDays(): number {
    return totalDaysIn(this.track);
  }

  /**
   * Whether the learner has reached the end of *their* track. `DayIndex` guards
   * 1..28 because that is the longest track; only the profile knows that day 25
   * is past the end of a `sprint21`.
   */
  hasFinishedProgram(): boolean {
    return this.currentDayIndex.value >= this.totalDays();
  }

  /**
   * Advances to tomorrow, returning a new instance. Stops at the end of the
   * track rather than walking off it — 003's `current_day_index` check would
   * reject day 29, and finishing is not an error worth throwing over.
   */
  /**
   * Onboarding, finished.
   *
   * A new instance rather than a mutation, like `advanceDay` — every entity
   * property in this project is `readonly` and a state change returns a copy.
   *
   * `onboardingCompletedAt` is what makes this idempotent in effect: the use
   * case above refuses to run twice, and 011 treats a non-null value as the
   * signal that the learner has chosen. Re-running it would silently rewrite
   * choices the learner made and then forgot they made.
   */
  completeOnboarding(choices: IOnboardingChoices, at: Date): LearnerProfile {
    return new LearnerProfile({
      ...this.toProps(),
      track: choices.track,
      dailyMinutes: choices.dailyMinutes,
      accentPreference: choices.accentPreference,
      onboardingCompletedAt: at,
    });
  }

  advanceDay(): LearnerProfile {
    if (this.hasFinishedProgram()) {
      return this;
    }

    return new LearnerProfile({
      ...this.toProps(),
      currentDayIndex: DayIndex.of(this.currentDayIndex.value + 1),
    });
  }

  private toProps(): ILearnerProfileProps {
    return {
      id: this.id,
      userId: this.userId,
      displayName: this.displayName,
      email: this.email,
      role: this.role,
      track: this.track,
      dailyMinutes: this.dailyMinutes,
      startedAt: this.startedAt,
      timezone: this.timezone,
      uiLanguage: this.uiLanguage,
      currentDayIndex: this.currentDayIndex,
      accentPreference: this.accentPreference,
      playbackRate: this.playbackRate,
      onboardingCompletedAt: this.onboardingCompletedAt,
    };
  }
}
