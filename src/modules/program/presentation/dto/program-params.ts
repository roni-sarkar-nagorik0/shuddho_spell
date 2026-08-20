import { z } from 'zod';

/**
 * `:dayIndex` off the url.
 *
 * `coerce` because a path segment is always a string, and this is the boundary
 * that is allowed to know that. A handler doing `Number(params.dayIndex)`
 * itself would accept `NaN` from `"abc"` and hand it to a use case, where
 * `DayIndex.of` would throw an `InvalidValueError` and become a 500 — a bad url
 * is a 422, not a server fault.
 */
export const programDayParamsSchema = z.object({
  dayIndex: z.coerce.number().int().min(1).max(28),
});

export interface IProgramDayParams {
  readonly dayIndex: number;
}

const _schemaMatchesContract: z.ZodType<IProgramDayParams> = programDayParamsSchema;
void _schemaMatchesContract;
