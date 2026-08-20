import { z } from 'zod';

/**
 * The client's view of the lesson endpoints.
 *
 * Every response the runtime reads is validated against one of these before it
 * reaches a component — `apiFetch` has no unvalidated path. These mirror the
 * use cases' output interfaces; where they drift, the fetch throws an
 * `ApiError` at the boundary instead of rendering `undefined` three components
 * down.
 */
export const LESSON_STAGE_VALUES = Object.freeze([
  'review',
  'learn',
  'dictate',
  'speak',
  'build',
] as const);

export const lessonSessionSchema = z.object({
  sessionId: z.string(),
  dayIndex: z.number(),
  stage: z.enum(LESSON_STAGE_VALUES),
  itemsTotal: z.number(),
  itemsCorrect: z.number(),
  resumed: z.boolean().optional(),
});

export type LessonSessionView = z.infer<typeof lessonSessionSchema>;

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

export const reviewResultSchema = z.object({
  isCorrect: z.boolean(),
  errorTags: z.array(z.string()),
  correctValue: z.string().nullable(),
  isMastered: z.boolean(),
  nextDueAt: z.string(),
});

export type ReviewResult = z.infer<typeof reviewResultSchema>;

export const attemptResultSchema = z.object({
  attemptId: z.string(),
  isCorrect: z.boolean(),
  score: z.number(),
  errorTags: z.array(z.string()),
  correctValue: z.string().nullable(),
  itemsTotal: z.number(),
  itemsCorrect: z.number(),
});

export type AttemptResult = z.infer<typeof attemptResultSchema>;
