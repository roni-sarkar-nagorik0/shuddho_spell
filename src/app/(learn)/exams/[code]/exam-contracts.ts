import { z } from 'zod';

/**
 * The exam runtime's client-side contract.
 *
 * Note what is **absent**: there is no `correctAnswer` field anywhere in this
 * file. Rule 3 of `08-exam-engine.md` is held on the server by
 * `IExamQuestionForLearner`, and stating the same shape here means a server
 * that ever started leaking one would fail validation in the browser rather
 * than quietly rendering it.
 */
export const examQuestionSchema = z.object({
  id: z.string(),
  sectionCode: z.string(),
  orderIndex: z.number(),
  type: z.string(),
  payload: z.unknown(),
  weight: z.number(),
});

export const examAnswerSchema = z.object({
  questionId: z.string(),
  submittedValue: z.string().nullable(),
  flagged: z.boolean(),
});

export const examAttemptSchema = z.object({
  attemptId: z.string(),
  code: z.string(),
  title: z.string(),
  status: z.string(),
  attemptNumber: z.number(),
  currentSectionIndex: z.number(),
  currentSectionCode: z.string().nullable(),
  sectionCount: z.number(),
  remainingSeconds: z.number(),
  serverDeadlineAt: z.string(),
  questions: z.array(examQuestionSchema).readonly(),
  answers: z.array(examAnswerSchema).readonly(),
});

export type ExamAttemptView = z.infer<typeof examAttemptSchema>;
export type ExamQuestionView = z.infer<typeof examQuestionSchema>;
export type ExamAnswerView = z.infer<typeof examAnswerSchema>;
