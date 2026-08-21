import { z } from 'zod';

/**
 * The client's view of the two admin endpoints.
 *
 * These mirror `IUserSummary` and `IUserRoster` in the auth module's
 * application layer, which are the contract. `src/app` may not import a
 * module's application types directly, so the shape is restated here and
 * validated on arrival — the same arrangement every other screen in the
 * project uses, and the reason a drifted field throws at the boundary instead
 * of rendering `undefined` inside a table cell.
 */
export const USER_ROLE_VALUES = Object.freeze(['user', 'admin'] as const);

export type UserRoleValue = (typeof USER_ROLE_VALUES)[number];

export const userSummarySchema = z.object({
  profileId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  email: z.string().nullable(),
  role: z.enum(USER_ROLE_VALUES),
  track: z.enum(['standard28', 'sprint21']),
  currentDayIndex: z.number(),
  totalDays: z.number(),
  hasOnboarded: z.boolean(),
  startedAt: z.string(),
  isSelf: z.boolean(),
});

export type UserSummaryView = z.infer<typeof userSummarySchema>;

export const userRosterSchema = z.object({
  // `readonly`, because this is handed straight into a component prop and the
  // application DTO it mirrors is readonly. A mutable array here would be the
  // one place in the chain where the list looks editable.
  users: z.array(userSummarySchema).readonly(),
  totalUsers: z.number(),
  totalAdmins: z.number(),
});

export type UserRosterView = z.infer<typeof userRosterSchema>;
