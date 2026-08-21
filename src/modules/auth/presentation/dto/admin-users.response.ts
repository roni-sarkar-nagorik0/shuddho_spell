import { z } from 'zod';
import { TRACKS } from '@/modules/shared/domain/value-objects/track';
import { USER_ROLES } from '../../domain/value-objects/user-role';
import { type IUserRoster, type IUserSummary } from '../../application/dto/user-summary';

/**
 * The admin endpoints' wire shapes.
 *
 * The application's `IUserSummary` is the contract; the schemas below must
 * *satisfy* it. That direction is the rule the rest of the project follows and
 * it is what makes a field added to the use case a compile error here rather
 * than a field the client silently never receives.
 */
export const userSummarySchema = z.object({
  profileId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  role: z.enum(USER_ROLES),
  track: z.enum(TRACKS),
  currentDayIndex: z.number().int(),
  totalDays: z.number().int(),
  hasOnboarded: z.boolean(),
  startedAt: z.string(),
  isSelf: z.boolean(),
});

export const userRosterSchema = z.object({
  users: z.array(userSummarySchema),
  totalUsers: z.number().int(),
  totalAdmins: z.number().int(),
});

// Compile-time only, in both directions of the two shapes this file carries.
const _summaryMatchesContract: z.ZodType<IUserSummary> = userSummarySchema;
const _rosterMatchesContract: z.ZodType<IUserRoster> = userRosterSchema;
void _summaryMatchesContract;
void _rosterMatchesContract;

/**
 * `PATCH /api/v1/admin/users/:id/role`.
 *
 * The body is the new role and nothing else. Sending `{ isAdmin: true }`
 * instead would make "neither" and "both" expressible on the wire, and the
 * column has two values.
 */
export const setUserRoleBodySchema = z.object({
  role: z.enum(USER_ROLES),
});

export type ISetUserRoleBody = z.infer<typeof setUserRoleBodySchema>;

/** The `:id` segment is a profile id, and as untrusted as a body. */
export const userParamsSchema = z.object({
  id: z.string().uuid(),
});

export type IUserParams = z.infer<typeof userParamsSchema>;
