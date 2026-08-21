import { z } from 'zod';

/**
 * `POST /api/v1/demo/attempts`.
 *
 * The word and what was typed — and **not** whether it was right. That is the
 * server's to decide from `Word.matches`, and leaving it off the wire is what
 * makes it impossible to claim.
 */
export const recordDemoAttemptBodySchema = z.object({
  wordId: z.string().uuid(),
  // Bounded because it is stored. The tiles cannot produce more than nine
  // characters; the ceiling is for anything that is not the tiles.
  submittedValue: z.string().min(1).max(64),
});

export type IRecordDemoAttemptBody = z.infer<typeof recordDemoAttemptBodySchema>;

export const demoAttemptResultSchema = z.object({
  attemptId: z.string(),
  isCorrect: z.boolean(),
});
