/**
 * What a signed-in person is allowed to do. 020's `learner_profiles_role_check`.
 *
 * Two values and no third. A `moderator` between them would need a second list
 * of what it may reach, and there is nothing in the product that wants one:
 * either you are a learner working through your own programme, or you are the
 * person who can see everybody's.
 *
 * The first account ever created is an `admin` — decided by 020's signup
 * trigger, inside the signup transaction, so there is no moment where a
 * database has users and no owner.
 */
export const USER_ROLES = Object.freeze(['user', 'admin'] as const);

export type UserRole = (typeof USER_ROLES)[number];
