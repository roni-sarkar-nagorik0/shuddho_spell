import { z } from 'zod';
import { parseRows } from '@/modules/shared/infrastructure/persistence/parse-rows';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';
import { Certificate } from '../../domain/entities/certificate';
import { VerificationCode } from '../../domain/value-objects/verification-code';

const rowSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  exam_attempt_id: z.string(),
  verification_code: z.string(),
  learner_name: z.string(),
  track: z.enum(TRACKS),
  // `numeric(5,2)` comes back as a string over PostgREST often enough that
  // accepting only a number would break on a live database and pass every test
  // against a fake.
  score_percent: z.union([z.number(), z.string()]),
  issued_at: z.string(),
  comparison: z.record(z.unknown()).nullable(),
  revoked_at: z.string().nullable(),
  revoked_reason: z.string().nullable(),
});

export const CERTIFICATE_COLUMNS =
  'id, profile_id, exam_attempt_id, verification_code, learner_name, track, score_percent, issued_at, comparison, revoked_at, revoked_reason';

export function toCertificates(rows: readonly unknown[]): readonly Certificate[] {
  return parseRows(rowSchema, rows).map(
    (parsed) =>
      new Certificate({
        id: parsed.id,
        profileId: parsed.profile_id,
        examAttemptId: parsed.exam_attempt_id,
        verificationCode: VerificationCode.of(parsed.verification_code),
        learnerName: parsed.learner_name,
        track: parsed.track,
        scorePercent: Number(parsed.score_percent),
        issuedAt: new Date(parsed.issued_at),
        comparison: parsed.comparison ?? {},
        revokedAt: parsed.revoked_at === null ? null : new Date(parsed.revoked_at),
        revokedReason: parsed.revoked_reason,
      }),
  );
}

export function toCertificate(row: unknown): Certificate | null {
  return row === null || row === undefined ? null : (toCertificates([row])[0] ?? null);
}

export function toCertificateRow(certificate: Certificate): Readonly<Record<string, unknown>> {
  return {
    id: certificate.id,
    profile_id: certificate.profileId,
    exam_attempt_id: certificate.examAttemptId,
    verification_code: certificate.verificationCode.value,
    learner_name: certificate.learnerName,
    track: certificate.track,
    score_percent: certificate.scorePercent,
    issued_at: certificate.issuedAt.toISOString(),
    comparison: certificate.comparison,
    revoked_at: certificate.revokedAt?.toISOString() ?? null,
    revoked_reason: certificate.revokedReason,
  };
}
