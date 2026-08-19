/**
 * The learner behind a session.
 *
 * Only the fields Phase 3 can honestly populate are here. `05-domain-model.md`
 * gives `LearnerProfile` ten — track, daily minutes, timezone, the rest — and
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
}
