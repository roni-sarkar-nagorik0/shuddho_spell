/**
 * 003's `learner_profiles_ui_language_check`. Bangla is the default, and that
 * is a product decision, not an oversight — the learner this is built for reads
 * Bangla more comfortably than the English they are here to learn.
 */
export const UI_LANGUAGES = Object.freeze(['en', 'bn'] as const);

export type UiLanguage = (typeof UI_LANGUAGES)[number];
