import { z } from 'zod';

/** No identity field, for the reason every request schema here has none. */
export const submitReviewBodySchema = z.object({
  reviewItemId: z.string().uuid(),
  submittedValue: z.string().min(1).max(500),
});

export interface ISubmitReviewBody {
  readonly reviewItemId: string;
  readonly submittedValue: string;
}

const _matches: z.ZodType<ISubmitReviewBody> = submitReviewBodySchema;
void _matches;
