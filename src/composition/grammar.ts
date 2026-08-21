import { GetGrammarLessonUseCase } from '@/modules/grammar/application/use-cases/get-grammar-lesson';
import { GetGrammarSyllabusUseCase } from '@/modules/grammar/application/use-cases/get-grammar-syllabus';
import { type IGrammarLessonView } from '@/modules/grammar/application/dto/grammar-lesson-view';
import { type IGrammarSyllabus } from '@/modules/grammar/application/dto/grammar-syllabus';
import { ContentGrammarLessonRepository } from '@/modules/grammar/infrastructure/persistence/content/grammar-lesson.repository';

/**
 * The grammar course's wiring — and the one part of the composition root that
 * is **not** built per request.
 *
 * Everything in `container.ts` is request-scoped for one reason: a Supabase
 * client holds the caller's cookies, and a handle that outlived them would
 * serve one learner's data to another. The grammar course has no cookies, no
 * learner and no database. It is a compiled-in array, identical for everyone,
 * so a container around it would be ceremony that implies a scope it does not
 * have — and would drag a database handle into a read that never touches one.
 *
 * It is still the composition root: this file names the implementation, and the
 * use cases take the port. `src/app` calls these through `reads.ts` like every
 * other read, and the screen tests call them directly, because a jsdom test has
 * no environment for `env.public` to parse and needs none to render a lesson.
 */
const lessons = new ContentGrammarLessonRepository();

export function grammarSyllabus(): Promise<IGrammarSyllabus> {
  return new GetGrammarSyllabusUseCase(lessons).execute();
}

export function grammarLesson(dayIndex: number): Promise<IGrammarLessonView | null> {
  return new GetGrammarLessonUseCase(lessons).execute({ dayIndex });
}
