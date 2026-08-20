import { ReviewItem } from '@/modules/review/domain/entities/review-item';
import { type IReviewSchedulingPolicy } from '@/modules/review/domain/services/review-scheduling-policy';
import { type LocalDate } from '@/modules/shared/domain/value-objects/local-date';
import { isJsonObject, type JsonValue } from '@/modules/shared/domain/value-objects/json-value';
import { type AttemptItemType } from '@/modules/shared/domain/value-objects/item-type';
import { type ExamQuestion } from '../entities/exam-question';
import { type ExamQuestionType } from '../value-objects/exam-question-type';

/**
 * Which content table a question's item lives in.
 *
 * Data rather than a `switch`, and it is not the same mapping as
 * section-to-type: dictation and pronunciation both ask about a **word**, the
 * other four about a **sentence**, and the section a question sits in does not
 * decide that.
 */
const ITEM_TYPE_BY_QUESTION: Readonly<Record<ExamQuestionType, AttemptItemType>> = Object.freeze({
  dictation: 'word',
  pronunciation: 'word',
  multiple_choice: 'sentence',
  construction: 'sentence',
  cloze: 'sentence',
  reading_response: 'sentence',
});

export interface IPrescriptionInput {
  readonly profileId: string;
  readonly questions: readonly ExamQuestion[];
  readonly marks: ReadonlyMap<string, { readonly isCorrect: boolean }>;
  readonly existing: readonly ReviewItem[];
  readonly now: Date;
  readonly localDay: LocalDate;
  readonly timezone: string;
  readonly policy: IReviewSchedulingPolicy;
  readonly newId: () => string;
}

/**
 * Turns a failed exam into work to do.
 *
 * Rule 8 of `08-exam-engine.md`: **a fail must leave the learner with a
 * concrete next action, never just a number.** A score of 64% tells somebody
 * they failed and nothing about what to do on Monday; a review queue holding
 * the eleven items they actually got wrong does.
 *
 * The prescription goes through the **same review ladder every wrong answer in
 * the product goes through** — `recordResult(false, …)` — rather than a
 * bespoke "exam drill" path. That matters: a word missed in an exam and the
 * same word missed in a lesson are the same gap, and two schedulers would give
 * a learner two contradictory due dates for one word.
 *
 * Pure. It is handed the existing items and returns the ones that changed.
 */
export class ExamPrescriptionService {
  prescribe(input: IPrescriptionInput): readonly ReviewItem[] {
    const prescribed = new Map<string, ReviewItem>();

    for (const question of input.questions) {
      if (input.marks.get(question.id)?.isCorrect !== false) {
        continue;
      }

      const itemId = itemIdOf(question.payload);

      // A question whose payload names no content item cannot be drilled. It is
      // still marked and still costs the learner points; there is simply
      // nothing to add to the queue.
      if (itemId === null) {
        continue;
      }

      const itemType = ITEM_TYPE_BY_QUESTION[question.type];

      const current =
        prescribed.get(itemId) ??
        input.existing.find((item) => item.itemId === itemId) ??
        new ReviewItem({
          id: input.newId(),
          profileId: input.profileId,
          itemId,
          itemType,
          intervalIndex: 0,
          dueAt: input.now,
          timesSeen: 0,
          timesCorrect: 0,
          consecutiveCorrect: 0,
          lastCorrectOn: null,
          isMastered: false,
          lastErrorTags: [],
        });

      prescribed.set(
        itemId,
        current.recordResult(false, input.now, input.localDay, input.policy, [], input.timezone),
      );
    }

    return [...prescribed.values()];
  }
}

/**
 * The content id a question is about.
 *
 * The blueprint puts it in the payload under the name of its table, because the
 * payload is also what the client renders and `wordId` reads better there than
 * a bare `itemId`. Read defensively: jsonb whose shape belongs elsewhere.
 */
function itemIdOf(payload: JsonValue): string | null {
  if (!isJsonObject(payload)) {
    return null;
  }

  const word = payload['wordId'];
  const sentence = payload['sentenceItemId'];

  if (typeof word === 'string') {
    return word;
  }

  return typeof sentence === 'string' ? sentence : null;
}
