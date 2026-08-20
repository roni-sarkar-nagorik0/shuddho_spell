import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { totalDaysIn, type Track } from '@/modules/shared/domain/value-objects/track';
import { type AccentPreference } from '../value-objects/accent-preference';
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
