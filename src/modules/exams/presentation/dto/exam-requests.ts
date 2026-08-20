import { z } from 'zod';
import { EXAM_CODES } from '../../domain/value-objects/exam-code';
import { EXAM_SECTION_CODES } from '../../domain/value-objects/exam-section-code';

/**
 * As everywhere else in this application, **no schema here declares an identity
 * field**. Which learner is sitting the exam comes from the verified session,
 * and a body that could carry a `profileId` is a body somebody will eventually
 * be able to set.
 *
 * There is also no field for a deadline, a score, an attempt number or a
 * question's correctness. Every one of those is server-authoritative, and the
 * cheapest way to keep a value off the wire is to give it nowhere to sit.
 */
export const examCodeParamsSchema = z.object({ code: z.enum(EXAM_CODES) });

export interface IExamCodeParams {
  readonly code: (typeof EXAM_CODES)[number];
}

const _codeParamsMatch: z.ZodType<IExamCodeParams> = examCodeParamsSchema;
void _codeParamsMatch;

export const attemptParamsSchema = z.object({ id: z.string().uuid() });

export interface IAttemptParams {
  readonly id: string;
}

/**
 * One endpoint, two acts, discriminated on `action`.
 *
 * Both write the same row and neither is the other: answering records what the
 * learner wrote, flagging records that they want to come back. A single shape
 * with two optional fields would have to decide what an absent `submittedValue`
 * means, and "clear the answer" and "leave it alone" are both plausible
 * readings of the same request — which is exactly the ambiguity a discriminated
 * union removes.
 */
export const saveAnswerBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('answer'),
    questionId: z.string().uuid(),
    submittedValue: z.string().max(2000),
    timeSpentMs: z.number().int().min(0).nullable(),
  }),
  z.object({
    action: z.literal('flag'),
    questionId: z.string().uuid(),
    flagged: z.boolean(),
  }),
]);

export type SaveAnswerBody = z.infer<typeof saveAnswerBodySchema>;

const _attemptParamsMatch: z.ZodType<IAttemptParams> = attemptParamsSchema;
void _attemptParamsMatch;

export const sectionParamsSchema = z.object({
  id: z.string().uuid(),
  code: z.enum(EXAM_SECTION_CODES),
});

export interface ISectionParams {
  readonly id: string;
  readonly code: (typeof EXAM_SECTION_CODES)[number];
}

const _sectionParamsMatch: z.ZodType<ISectionParams> = sectionParamsSchema;
void _sectionParamsMatch;
