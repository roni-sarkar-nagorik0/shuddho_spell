import { z } from 'zod';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';

/**
 * What `GET /api/v1/me` returns, interface first.
 *
 * The schema below must *satisfy* this, not define it: the interface is the
 * contract both sides read, and a schema that drifted from it would fail this
 * file's compile rather than a client's render.
 */
export interface IMeResponse {
  readonly userId: string;
  readonly profileId: string;
  readonly email: string;
  readonly displayName: string;
  readonly program: IProgramPosition;
}

export interface IProgramPosition {
  readonly track: 'standard28' | 'sprint21';
  readonly currentDayIndex: number;
  /** 28 or 21, by track. A position with no total is not a position. */
  readonly totalDays: number;
  readonly hasOnboarded: boolean;
}

export const meResponseSchema = z.object({
  userId: z.string(),
  profileId: z.string(),
  email: z.string(),
  displayName: z.string(),
  program: z.object({
    track: z.enum(TRACKS),
    currentDayIndex: z.number().int(),
    totalDays: z.number().int(),
    hasOnboarded: z.boolean(),
  }),
});

// Compile-time only: the schema is checked against the interface, never the
// other way round.
const _schemaMatchesContract: z.ZodType<IMeResponse> = meResponseSchema;
void _schemaMatchesContract;
