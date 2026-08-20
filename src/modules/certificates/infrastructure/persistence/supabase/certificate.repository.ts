import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { type Certificate } from '../../../domain/entities/certificate';
import { type ICertificateRepository } from '../../../domain/repositories/certificate-repository';
import { type VerificationCode } from '../../../domain/value-objects/verification-code';
import {
  CERTIFICATE_COLUMNS,
  toCertificate,
  toCertificateRow,
  toCertificates,
} from '../../mappers/certificate.mapper';

export class SupabaseCertificateRepository implements ICertificateRepository {
  constructor(private readonly db: IDatabase) {}

  async findById(id: string): Promise<Certificate | null> {
    return toCertificate(
      await this.db.selectOne({ table: 'certificates', columns: CERTIFICATE_COLUMNS, eq: { id } }),
    );
  }

  async findByAttempt(examAttemptId: string): Promise<Certificate | null> {
    return toCertificate(
      await this.db.selectOne({
        table: 'certificates',
        columns: CERTIFICATE_COLUMNS,
        eq: { exam_attempt_id: examAttemptId },
      }),
    );
  }

  async findByProfile(profileId: string): Promise<readonly Certificate[]> {
    return toCertificates(
      await this.db.select({
        table: 'certificates',
        columns: CERTIFICATE_COLUMNS,
        eq: { profile_id: profileId },
        orderBy: { column: 'issued_at', ascending: false },
      }),
    );
  }

  /**
   * Reads `certificates` rather than the public `certificate_verifications`
   * view, because this repository runs behind the service client and already
   * has the row. The **view** is what an anonymous caller reaches through
   * PostgREST; this path is the app's own, and the use case above it is what
   * decides how much of the row is allowed out.
   */
  async findByVerificationCode(code: VerificationCode): Promise<Certificate | null> {
    return toCertificate(
      await this.db.selectOne({
        table: 'certificates',
        columns: CERTIFICATE_COLUMNS,
        eq: { verification_code: code.value },
      }),
    );
  }

  /**
   * `IDatabase.insert` returns nothing, so the entity handed in is what comes
   * back. That is correct here rather than a shortcut: every column is set
   * explicitly by `toCertificateRow` — including the id and `issued_at` — so
   * there is no default for the database to fill in and nothing to read back.
   */
  async create(certificate: Certificate): Promise<Certificate> {
    await this.db.insert('certificates', [toCertificateRow(certificate)]);

    return certificate;
  }
}
