import { totalDaysIn, type Track } from '@/modules/shared/domain/value-objects/track';

/**
 * The learner behind a session.
 *
 * Only the fields Phase 3 has a use for are here. `05-domain-model.md` gives
 * `LearnerProfile` ten — daily minutes, timezone, accent, playback rate — and
 * every one of them is a default in 003 until the onboarding screen asks for
 * it. Modelling them now would be inventing answers nobody has given. Phase 4
 * grows this entity when there is something to grow it with.
 */
export class LearnerProfile {
  constructor(
    readonly id: string,
    /** The `auth.users` row this profile hangs off. */
    readonly userId: string,
    readonly displayName: string,
    readonly track: Track,
    /** 1-based, and never past the end of the track — 003 checks both. */
    readonly currentDayIndex: number,
    /** Null until onboarding is finished — 011. */
    readonly onboardingCompletedAt: Date | null,
  ) {}

  /**
   * What `/auth/callback` routes on. A behaviour rather than a null check at
   * the call site, because "has this learner been here before" is a question
   * about the learner, and the answer changes shape in Phase 11.
   */
  hasOnboarded(): boolean {
    return this.onboardingCompletedAt !== null;
  }

  /**
   * A position with no total is not a position. The track is what says whether
   * day 19 is nearly finished or two-thirds through, so the pair travels
   * together and neither the handler nor the client has to know the mapping.
   */
  totalDays(): number {
    return totalDaysIn(this.track);
  }
}
