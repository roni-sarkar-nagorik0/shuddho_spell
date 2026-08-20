import { VerificationCode } from '../../domain/value-objects/verification-code';
import { type ICertificateRepository } from '../../domain/repositories/certificate-repository';
import { type ICertificateVerification } from '../dto/certificate-view';

export interface IVerifyCertificateInput {
  /** As typed. Hyphens optional, case irrelevant — people retype these badly. */
  readonly code: string;
}

/**
 * The public check. **No identity, no session, no learner.**
 *
 * This is the only use case in the product that takes no `userId`, and that is
 * the feature: a certificate is a claim its holder publishes, and a verifier is
 * by definition a stranger. Requiring an account to check one would make it
 * unverifiable by the people it exists to convince.
 *
 * It returns the smaller `ICertificateVerification` shape, matching 008's
 * public view field for field, so the app's route cannot expose more than the
 * anonymous SQL path already does.
 *
 * A malformed code and an unknown code both return `null`. Distinguishing them
 * would tell a scanner which of its guesses were the right *shape*.
 */
export class VerifyCertificateUseCase {
  constructor(private readonly certificates: ICertificateRepository) {}

  async execute(input: IVerifyCertificateInput): Promise<ICertificateVerification | null> {
    let code: VerificationCode;

    try {
      code = VerificationCode.of(VerificationCode.normalise(input.code));
    } catch {
      return null;
    }

    const certificate = await this.certificates.findByVerificationCode(code);

    if (certificate === null) {
      return null;
    }

    return {
      verificationCode: certificate.verificationCode.value,
      learnerName: certificate.learnerName,
      track: certificate.track,
      scorePercent: certificate.scorePercent,
      issuedAt: certificate.issuedAt.toISOString(),
      isValid: certificate.isValid(),
      revokedAt: certificate.revokedAt?.toISOString() ?? null,
      revokedReason: certificate.revokedReason,
    };
  }
}
