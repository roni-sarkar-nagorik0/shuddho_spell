/**
 * Which English the learner is training towards. 003's
 * `learner_profiles_accent_check`; it selects the audio and the target IPA.
 */
export const ACCENT_PREFERENCES = Object.freeze(['british', 'american'] as const);

export type AccentPreference = (typeof ACCENT_PREFERENCES)[number];
