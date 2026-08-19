/**
 * The five stages of a day's lesson, **in the order they must happen**.
 *
 * The order is the data. `advanceStage()` reads position in this array to
 * decide what is legal, so the sequence is stated once rather than duplicated
 * into a transition map that could disagree with 003's check constraint.
 *
 * Why this order: yesterday's material is reviewed before anything new is met,
 * new words are seen before they are spelled from audio, spelled before they
 * are spoken, and only then used in a sentence. Each stage is the previous
 * one's prerequisite, which is exactly why skipping is a domain error rather
 * than a UI concern.
 */
export const LESSON_STAGES = Object.freeze([
  'review',
  'learn',
  'dictate',
  'speak',
  'build',
] as const);

export type LessonStage = (typeof LESSON_STAGES)[number];

export function stagePosition(stage: LessonStage): number {
  return LESSON_STAGES.indexOf(stage);
}
