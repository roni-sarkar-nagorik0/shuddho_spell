import { type IDatabase } from '@/modules/shared/infrastructure/persistence/database';
import { toReviewItemRow } from '@/modules/review/infrastructure/mappers/review-item.mapper';
import {
  type IAttemptStartWrite,
  type IAttemptSubmitWrite,
  type IExamWriteUnit,
} from '../../application/ports/exam-write-unit';
import { toExamAnswerRow } from '../mappers/exam-answer.mapper';
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

  /**
   * 016's `submit_exam_attempt`.
   *
   * The review rows are built by the **review module's own mapper**, not by a
   * shape written here, so an exam prescription and a lesson's wrong answer
   * cannot produce different columns for the same table.
   */
  async submitAttempt(write: IAttemptSubmitWrite): Promise<void> {
    await this.db.rpc('submit_exam_attempt', {
      p_attempt_id: write.attempt.id,
      p_status: write.attempt.status,
      p_score_percent: write.attempt.scorePercent?.value ?? null,
      p_section_scores: write.attempt.sectionScores,
      p_passed: write.attempt.passed,
      p_submitted_at: write.attempt.submittedAt?.toISOString() ?? null,
      p_answers: write.answers.map(toExamAnswerRow),
      p_review_items: write.prescription.map(toReviewItemRow),
      p_advance_to_day: write.advanceToDayIndex,
    });
  }
}
