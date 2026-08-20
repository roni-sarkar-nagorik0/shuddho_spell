import { z } from 'zod';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';
import { USER_ROLES } from '../../domain/value-objects/user-role';

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
  /**
   * What this account may do — 020.
   *
   * Here rather than on a separate `/api/v1/admin/me`: whether the rail shows
   * an Admin link is a fact about the signed-in person, and a second endpoint
   * to ask it would be a second answer able to disagree with this one.
   */
  readonly role: 'user' | 'admin';
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
  role: z.enum(USER_ROLES),
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
