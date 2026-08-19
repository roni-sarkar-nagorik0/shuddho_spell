import { type Json } from '@/lib/db/json';

/**
 * `public.certificates` — 006_certificates.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface ICertificateRow {
  readonly id: string;
  readonly profile_id: string;
  readonly exam_attempt_id: string;
  /** `XXXX-XXXX-XXXX`. The public verification view exposes this and no owner. */
  readonly verification_code: string;
  readonly learner_name: string;
  readonly track: string;
  readonly score_percent: number;
  readonly issued_at: string;
  readonly comparison: Json;
  /** Revocation is an update, never a delete: a revoked certificate must still verify. */
  readonly revoked_at: string | null;
  readonly revoked_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
