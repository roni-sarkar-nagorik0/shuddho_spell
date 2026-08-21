import { type DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { type GrammarLesson } from '../entities/grammar-lesson';

export const GRAMMAR_LESSON_REPOSITORY = Symbol('GRAMMAR_LESSON_REPOSITORY');

/**
 * Where the grammar course comes from.
 *
 * A port, even though today's only adapter reads a file that is compiled into
 * the bundle. The port is what keeps that a **fact about the adapter** rather
 * than a fact about the module: the day this course needs to be editable
 * without a deploy, a Supabase adapter replaces the content one and no use
 * case, screen or test changes.
 */
export interface IGrammarLessonRepository {
  /** All 28, in order. The whole course is small and fixed. */
  readonly listAll: () => Promise<readonly GrammarLesson[]>;

  readonly findByDay: (day: DayIndex) => Promise<GrammarLesson | null>;
}
