import { type IClock } from '@/modules/shared/application/ports/clock';
import { TRACKS, type Track } from '@/modules/shared/domain/value-objects/track';
import { ACCENT_PREFERENCES, type AccentPreference } from '../../domain/value-objects/accent-preference';
import { ProfileNotFoundError } from '../../domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '../../domain/repositories/learner-profile-repository';

export interface ICompleteOnboardingInput {
  readonly userId: string;
  readonly track: Track;
  readonly dailyMinutes: number;
  readonly accentPreference: AccentPreference;
}

export interface IOnboardingState {
  readonly completed: boolean;
  readonly track: Track;
  readonly dailyMinutes: number;
  readonly accentPreference: AccentPreference;
  readonly currentDayIndex: number;
}

/** 003's `learner_profiles_daily_minutes_range`, restated so a bad value is a 422. */
const MIN_MINUTES = 5;
const MAX_MINUTES = 120;

/**
 * The learner's own choices, written once.
 *
 * **Idempotent, and refusing rather than overwriting.** A profile with
 * `onboarding_completed_at` set has already chosen; re-running this would
 * silently rewrite a track the learner picked weeks ago and has since forgotten
 * choosing, and the programme's day count depends on it. So a second call
 * returns the existing state and changes nothing.
 *
 * That is also what makes the wizard resumable: it can ask for this at any
 * point, at any step, and get back either "not yet, and here is what is stored"
 * or "already done". No draft has to survive on the server for that to work.
 *
 * The reminder time is deliberately not written here — it belongs to
 * `notification_preferences`, and the onboarding screen sets it through the
 * preferences endpoint that already owns it. One fact, one home.
 */
export class CompleteOnboardingUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: ICompleteOnboardingInput): Promise<IOnboardingState> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    if (profile.hasOnboarded()) {
      return toState(profile.track, profile.dailyMinutes, profile.accentPreference, profile.currentDayIndex.value, true);
    }

    const minutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(input.dailyMinutes)));

    const saved = await this.profiles.save(
      profile.completeOnboarding(
        {
          track: input.track,
          dailyMinutes: minutes,
          accentPreference: input.accentPreference,
        },
        this.clock.now(),
      ),
    );

    return toState(saved.track, saved.dailyMinutes, saved.accentPreference, saved.currentDayIndex.value, true);
  }

  /** What the wizard reads on mount, so an abandoned run resumes where it stopped. */
  async read(userId: string): Promise<IOnboardingState> {
    const profile = await this.profiles.findByUserId(userId);

    if (profile === null) {
      throw new ProfileNotFoundError(userId);
    }

    return toState(
      profile.track,
      profile.dailyMinutes,
      profile.accentPreference,
      profile.currentDayIndex.value,
      profile.hasOnboarded(),
    );
  }
}

function toState(
  track: Track,
  dailyMinutes: number,
  accentPreference: AccentPreference,
  currentDayIndex: number,
  completed: boolean,
): IOnboardingState {
  return { completed, track, dailyMinutes, accentPreference, currentDayIndex };
}

export const ONBOARDING_TRACKS = TRACKS;
export const ONBOARDING_ACCENTS = ACCENT_PREFERENCES;
