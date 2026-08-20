import { z } from 'zod';
import { LESSON_STAGES } from '../../domain/value-objects/lesson-stage';

/**
 * Every one of these schemas is missing something on purpose: **there is no
 * `profileId` and no `userId` field anywhere.** Identity comes from the
 * verified session, and a schema that accepted an identity field would be a
 * place for a body to supply one — F3.12's rule, enforced by a sweep over the
 * whole tree.
 */
export const startSessionBodySchema = z.object({
  dayIndex: z.number().int().min(1).max(28),
});

export interface IStartSessionBody {
  readonly dayIndex: number;
}

export const advanceStageBodySchema = z.object({
  /** Where the client believes it is going. The entity checks it. */
  toStage: z.enum(LESSON_STAGES),
});

export interface IAdvanceStageBody {
  readonly toStage: (typeof LESSON_STAGES)[number];
}

/**
 * One endpoint for both answer kinds, discriminated on `mode`.
 *
 * A union rather than two routes because they are the same act — the learner
 * answered the item in front of them — and splitting them would duplicate the
 * session lookup, the ownership check and the day-membership check.
 */
export const submitAttemptBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('dictation'),
    wordId: z.string().uuid(),
    submittedValue: z.string().min(1).max(200),
    latencyMs: z.number().int().min(0).nullable(),
  }),
  z.object({
    mode: z.literal('pronunciation'),
    wordId: z.string().uuid(),
    /**
     * The transcript, and **nothing but the transcript**.
     *
     * There is no audio field here and there must never be one:
     * `07-speech-scoring.md` makes "the server never receives audio" a hard
     * constraint, and a schema is where a constraint like that is either true
     * or merely intended. The browser transcribes with the Web Speech API and
     * posts the text; the score is still computed on the server, because a
     * client-computed score is a client-editable score.
     */
    transcript: z.string().max(500),
    /**
     * An observed pronunciation, when the client has one — a phonetic
     * self-assessment, or an acoustic model later. Untrusted exactly as the
     * transcript is untrusted, and no more: it is an observation, not an
     * identity and not a score.
     */
    heardPhonemes: z
      .object({
        phonemes: z.array(z.string().min(1).max(8)).max(40),
        stressIndex: z.number().int().min(0).max(39).nullable(),
      })
      .nullable(),
    latencyMs: z.number().int().min(0).nullable(),
  }),
  z.object({
    mode: z.literal('construction'),
    sentenceItemId: z.string().uuid(),
    submittedValue: z.string().min(1).max(500),
    latencyMs: z.number().int().min(0).nullable(),
  }),
]);

export type SubmitAttemptBody = z.infer<typeof submitAttemptBodySchema>;

export const sessionParamsSchema = z.object({ id: z.string().uuid() });

export interface ISessionParams {
  readonly id: string;
}

const _startMatches: z.ZodType<IStartSessionBody> = startSessionBodySchema;
const _advanceMatches: z.ZodType<IAdvanceStageBody> = advanceStageBodySchema;
const _paramsMatch: z.ZodType<ISessionParams> = sessionParamsSchema;
void _startMatches;
void _advanceMatches;
void _paramsMatch;
