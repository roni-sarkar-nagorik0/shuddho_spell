import { z } from 'zod';

/**
 * The review endpoints' client-side contract, beside the component that reads
 * them. Every response is validated before it reaches a component — `apiFetch`
 * has no unvalidated path.
 */
export const reviewResultSchema = z.object({
  isCorrect: z.boolean(),
  errorTags: z.array(z.string()),
  correctValue: z.string().nullable(),
  isMastered: z.boolean(),
  nextDueAt: z.string(),
});

export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const dueReviewQueueSchema = z.object({
  items: z.array(
    z.object({
      reviewItemId: z.string(),
      itemId: z.string(),
      itemType: z.string(),
      prompt: z.string(),
      daysOverdue: z.number(),
      lastErrorTags: z.array(z.string()),
    }),
  ),
  totalDue: z.number(),
});

export type DueReviewQueue = z.infer<typeof dueReviewQueueSchema>;
