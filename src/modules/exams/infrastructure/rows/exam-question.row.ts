import { type Json } from '@/lib/db/json';

/**
 * `public.exam_questions` — 004_exam_tables.sql
 *
 * Hand-written from the SQL. This interface must not leave `infrastructure/`.
 *
 * `correct_answer` is on this row because the row mirrors the table, and the
 * service role is the only thing that can read the table at all — 008 grants
 * the client roles nothing on it. The rule this interface must never break is
 * that no mapper copies the column into anything a response is built from.
 * `migrations.test.ts` guards the privilege side; the exam engine guards this
 * side in Phase 7.
 */
export interface IExamQuestionRow {
  readonly id: string;
  readonly attempt_id: string;
  readonly section_code: string;
  readonly order_index: number;
  readonly type: string;
  readonly payload: Json;
  readonly correct_answer: Json;
  readonly weight: number;
  readonly created_at: string;
  readonly updated_at: string;
}
