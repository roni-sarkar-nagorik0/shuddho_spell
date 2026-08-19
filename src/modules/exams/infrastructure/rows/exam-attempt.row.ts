import { type Json } from '@/lib/db/json';

/**
 * `public.exam_attempts` — 004_exam_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 */
export interface IExamAttemptRow {
  readonly id: string;
  readonly profile_id: string;
  readonly definition_id: string;
  readonly attempt_number: number;
  readonly status: string;
  readonly started_at: string | null;
  /** The only deadline that counts. Never read from the client. */
  readonly server_deadline_at: string | null;
  readonly submitted_at: string | null;
  readonly current_section_index: number;
  readonly score_percent: number | null;
  readonly section_scores: Json;
  readonly passed: boolean | null;
  /** Seeds the question shuffle so a resumed attempt sees the same paper. */
  readonly seed: string;
  readonly created_at: string;
  readonly updated_at: string;
}
