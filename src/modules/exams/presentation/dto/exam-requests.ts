import { z } from 'zod';
import { EXAM_CODES } from '../../domain/value-objects/exam-code';

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
