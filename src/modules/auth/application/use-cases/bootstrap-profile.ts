import {
  type ILearnerProfileRepository,
} from '../../domain/repositories/learner-profile-repository';
import { type LearnerProfile } from '../../domain/entities/learner-profile';

export interface IBootstrapProfileInput {
  /** `auth.users.id`, from the verified session and nowhere else. */
  readonly userId: string;
  /** Whatever Google gave us: a full name, a name, or nothing at all. */
  readonly fullName?: string | undefined;
  readonly email?: string | undefined;
}

const FALLBACK_DISPLAY_NAME = 'Learner';

/**
 * Reconciles the profile a signed-in learner must have.
 *
 * 009's `on_auth_user_created` trigger already makes the row, in the same
 * transaction as the signup, so this is almost always a read. It exists for the
 * "almost": a trigger dropped by a bad migration, a user created before it
 * existed, a row deleted by hand. `04-authentication.md` calls it the idempotent
 * reconciler on top of the trigger, and that is exactly the relationship —
 * running it a hundred times leaves one profile.
 *
 * What it owns that the repository cannot is the display name. A profile's
 * `display_name` is `not null` with a non-blank check, so "Google sent nothing
 * useful" has to resolve to *something* before the insert, and the same
 * fallback chain the trigger uses is reproduced here so the two cannot disagree
 * about what a learner is called.
 */
export class BootstrapProfileUseCase {
  constructor(private readonly profiles: ILearnerProfileRepository) {}

  async execute(input: IBootstrapProfileInput): Promise<LearnerProfile> {
    const existing = await this.profiles.findByUserId(input.userId);
    if (existing !== null) {
      return existing;
    }

    return this.profiles.insertIfAbsent({
      userId: input.userId,
      displayName: resolveDisplayName(input),
    });
  }
}

/**
 * The chain from 009: a full name, then a name, then the part of the email
 * before the `@`, then a word that is at least not blank. Whitespace-only is
 * treated as absent — `'   '` passes a `not null` check and reads as a bug.
 */
function resolveDisplayName(input: IBootstrapProfileInput): string {
  const candidates: readonly (string | undefined)[] = [
    input.fullName,
    input.email?.split('@')[0],
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim() ?? '';
    if (trimmed !== '') {
      return trimmed;
    }
  }

  return FALLBACK_DISPLAY_NAME;
}
