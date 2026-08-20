import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type ICertificateRepository } from '../../domain/repositories/certificate-repository';
import {
  type ICertificateComparisonRow,
  type ICertificateView,
} from '../dto/certificate-view';

export interface IGetCertificateInput {
  readonly userId: string;
  readonly certificateId: string;
}

/**
 * The owner's certificate, with the comparison the public view withholds.
 *
 * Ownership is checked against the session's profile, not against anything in
 * the request. A certificate that belongs to someone else returns `null` — the
 * same answer as one that does not exist, because telling them apart confirms
 * an id.
 */
export class GetCertificateUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly certificates: ICertificateRepository,
  ) {}

  async execute(input: IGetCertificateInput): Promise<ICertificateView | null> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const certificate = await this.certificates.findById(input.certificateId);

    if (certificate === null || certificate.profileId !== profile.id) {
      return null;
    }

    return {
      id: certificate.id,
      verificationCode: certificate.verificationCode.value,
      learnerName: certificate.learnerName,
      track: certificate.track,
      scorePercent: certificate.scorePercent,
      issuedAt: certificate.issuedAt.toISOString(),
      examAttemptId: certificate.examAttemptId,
      isValid: certificate.isValid(),
      revokedReason: certificate.revokedReason,
      comparison: toComparisonRows(certificate.comparison),
    };
  }
}

/**
 * `comparison` is `jsonb` with no schema in the database, so it is read
 * defensively: anything that is not a `{ label, before, after }` triple is
 * dropped rather than rendered as `undefined` on a document the learner may
 * show to an employer.
 */
function toComparisonRows(
  comparison: Readonly<Record<string, unknown>>,
): readonly ICertificateComparisonRow[] {
  const rows = comparison['rows'];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.flatMap((entry): readonly ICertificateComparisonRow[] => {
    if (typeof entry !== 'object' || entry === null) {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const { label, before, after } = record;

    return typeof label === 'string' && typeof before === 'number' && typeof after === 'number'
      ? [{ label, before, after }]
      : [];
  });
}
