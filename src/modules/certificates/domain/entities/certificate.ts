import { type Track } from '@/modules/shared/domain/value-objects/track';
import { type VerificationCode } from '../value-objects/verification-code';

export interface ICertificateProps {
  readonly id: string;
  readonly profileId: string;
  readonly examAttemptId: string;
  readonly verificationCode: VerificationCode;
  /**
   * Snapshotted at issue and never joined at read time — 006 says so, and the
   * reason is that a certificate must keep saying what it said on the day it
   * was issued even if the learner later changes their display name.
   */
  readonly learnerName: string;
  readonly track: Track;
  readonly scorePercent: number;
  readonly issuedAt: Date;
  /** Day-1 against day-28. Private to the learner; the public view omits it. */
  readonly comparison: Readonly<Record<string, unknown>>;
  readonly revokedAt: Date | null;
  readonly revokedReason: string | null;
}

/**
 * A claim the holder can publish and a stranger can check.
 *
 * **Revocation is a state, not a deletion.** 006 keeps the row and sets
 * `revoked_at`, because deleting it would make a forged copy of the code
 * indistinguishable from one that never existed — the verifier would see "not
 * found" in both cases and could not tell fraud from a typo.
 */
export class Certificate {
  readonly id: string;
  readonly profileId: string;
  readonly examAttemptId: string;
  readonly verificationCode: VerificationCode;
  readonly learnerName: string;
  readonly track: Track;
  readonly scorePercent: number;
  readonly issuedAt: Date;
  readonly comparison: Readonly<Record<string, unknown>>;
  readonly revokedAt: Date | null;
  readonly revokedReason: string | null;

  constructor(props: ICertificateProps) {
    this.id = props.id;
    this.profileId = props.profileId;
    this.examAttemptId = props.examAttemptId;
    this.verificationCode = props.verificationCode;
    this.learnerName = props.learnerName;
    this.track = props.track;
    this.scorePercent = props.scorePercent;
    this.issuedAt = props.issuedAt;
    this.comparison = props.comparison;
    this.revokedAt = props.revokedAt;
    this.revokedReason = props.revokedReason;
  }

  isValid(): boolean {
    return this.revokedAt === null;
  }
}
