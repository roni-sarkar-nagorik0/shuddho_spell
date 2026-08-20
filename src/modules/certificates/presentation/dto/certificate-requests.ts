import { z } from 'zod';

/**
 * The verification code as typed. Loose on purpose: hyphens optional, case
 * irrelevant, whitespace trimmed by the use case. A verifier is retyping twelve
 * characters off somebody else's screen, and rejecting `abcd efgh ijkl` at the
 * schema would be rejecting the most likely correct input.
 *
 * The upper bound is what stops it being a free-text field.
 */
export const verifyParamsSchema = z.object({
  code: z.string().min(1).max(32),
});

export interface IVerifyParams {
  readonly code: string;
}

const _matches: z.ZodType<IVerifyParams> = verifyParamsSchema;
void _matches;
