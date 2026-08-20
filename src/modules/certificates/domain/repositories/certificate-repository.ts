import { type Certificate } from '../entities/certificate';
import { type VerificationCode } from '../value-objects/verification-code';

export const CERTIFICATE_REPOSITORY = Symbol('CERTIFICATE_REPOSITORY');

export interface ICertificateRepository {
  readonly findById: (id: string) => Promise<Certificate | null>;

  /** The owner's view. Used to decide whether one has already been issued. */
  readonly findByAttempt: (examAttemptId: string) => Promise<Certificate | null>;

  readonly findByProfile: (profileId: string) => Promise<readonly Certificate[]>;

  /**
   * The **public** lookup. Returns a revoked certificate too — a revoked one
   * must verify as revoked, and returning null would make it look like a code
   * that never existed.
   */
  readonly findByVerificationCode: (code: VerificationCode) => Promise<Certificate | null>;

  readonly create: (certificate: Certificate) => Promise<Certificate>;
}
