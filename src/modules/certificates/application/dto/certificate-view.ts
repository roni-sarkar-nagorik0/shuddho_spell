import { type Track } from '@/modules/shared/domain/value-objects/track';

/** The owner's view: everything, including the private day-1 vs day-28 comparison. */
export interface ICertificateView {
  readonly id: string;
  readonly verificationCode: string;
  readonly learnerName: string;
  readonly track: Track;
  readonly scorePercent: number;
  readonly issuedAt: string;
  readonly examAttemptId: string;
  readonly isValid: boolean;
  readonly revokedReason: string | null;
  readonly comparison: readonly ICertificateComparisonRow[];
}

/** One line of the day-1 against day-28 comparison. */
export interface ICertificateComparisonRow {
  readonly label: string;
  readonly before: number;
  readonly after: number;
}

/**
 * The **public** view, and deliberately smaller.
 *
 * No id, no attempt id, no comparison — 008's `certificate_verifications` view
 * excludes exactly these, and this shape says the same thing in the application
 * layer so that the app's own route cannot accidentally expose more than the
 * anonymous SQL path does.
 *
 * `revokedReason` is exposed on purpose. A revoked certificate must verify *as
 * revoked*; hiding it would make revoked and valid indistinguishable, which
 * defeats the point of verification.
 */
export interface ICertificateVerification {
  readonly verificationCode: string;
  readonly learnerName: string;
  readonly track: Track;
  readonly scorePercent: number;
  readonly issuedAt: string;
  readonly isValid: boolean;
  readonly revokedAt: string | null;
  readonly revokedReason: string | null;
}
