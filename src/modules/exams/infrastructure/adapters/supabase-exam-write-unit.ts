import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import {
  type IAttemptStartWrite,
  type IExamWriteUnit,
} from '../../application/ports/exam-write-unit';
import { toExamAttemptRow } from '../mappers/exam-attempt.mapper';
import { toExamQuestionRow } from '../mappers/exam-question.mapper';

export class SupabaseExamWriteUnit implements IExamWriteUnit {
  constructor(private readonly db: IDatabase) {}

  /**
   * 015's `start_exam_attempt`.
   *
   * The rows are built by the same mappers every repository uses, so the shape
   * the function receives cannot drift from the shape a plain write would
   * produce. `profile_id` and `definition_id` are passed as **arguments** and
   * the function reads them from there rather than from the payload — a body
   * naming somebody else's profile starts an attempt for the caller, not them.
   *
   * `attempt_number` in the payload is ignored by the function, which derives
   * it under a row lock. Two tabs starting at once would otherwise both compute
   * "attempt 1" from a count read a moment earlier and the second would be
   * rejected by the unique constraint.
   */
  async startAttempt(write: IAttemptStartWrite): Promise<string> {
    const returned = await this.db.rpc('start_exam_attempt', {
      p_profile_id: write.attempt.profileId,
      p_definition_id: write.attempt.definitionId,
      p_attempt: toExamAttemptRow(write.attempt),
      p_questions: write.questions.map(toExamQuestionRow),
    });

    return typeof returned === 'string' ? returned : write.attempt.id;
  }
}
