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

/**
 * What `PATCH /sessions/:id/stage` answers with — and it is **not** a session.
 *
 * `AdvanceLessonStageUseCase` returns `{ sessionId, stage }`, because a stage
 * move changes the stage and nothing else: the day is the day and the counters
 * belong to the attempts. Validating that reply against `lessonSessionSchema`
 * is what the runtime used to do, and the three fields it was missing made
 * every successful advance look like a refusal — a 200 in the server log, "that
 * stage could not be started" on the screen, and a learner stuck on Review with
 * nothing wrong at either end.
 *
 * So this mirrors the use case's own output, which is the rule this file states
 * at the top and the one that was broken.
 */
export const lessonStageMoveSchema = z.object({
  sessionId: z.string(),
  stage: z.enum(LESSON_STAGE_VALUES),
});

export type LessonStageMoveView = z.infer<typeof lessonStageMoveSchema>;

/*
 * The review schemas used to live here. They moved to
 * `components/lesson/review-contracts.ts` when `/practice` needed the same
 * drill (F11.9) — one contract beside the one component that reads it.
 */

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
