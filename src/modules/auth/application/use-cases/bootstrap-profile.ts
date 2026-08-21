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
 * It is also where the profile's copy of the address is kept current: 020 added
 * `email` to the table for the admin roster, and this use case is the only code
 * that sees a verified session's address on every single sign-in.
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
    const email = input.email ?? null;
    const existing = await this.profiles.findByUserId(input.userId);

    if (existing !== null) {
      // The address, refreshed. 020 keeps a copy of it on the profile so the
      // admin roster can name people it holds no session for, and a copy is
      // only worth having if something rewrites it — this is that something,
      // and it runs on every sign-in. `withEmail` returns the same instance
      // when nothing changed, so the ordinary case is still a single read.
      const refreshed = existing.withEmail(email);

      return refreshed === existing ? existing : this.profiles.save(refreshed);
    }

    return this.profiles.insertIfAbsent({
      userId: input.userId,
      displayName: resolveDisplayName(input),
      email,
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
