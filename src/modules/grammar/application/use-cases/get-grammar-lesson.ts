import { type IGrammarLessonRepository } from '../../domain/repositories/grammar-lesson-repository';
import { type IGrammarLessonView } from '../dto/grammar-lesson-view';

export interface IGetGrammarLessonInput {
  readonly dayIndex: number;
}

/**
 * One day of the course, with the day either side of it.
 *
 * Returns `null` rather than throwing for a day that does not exist. The only
 * caller is a URL segment — `/grammar/99` and `/grammar/abc` arrive as readily
 * as `/grammar/3` — and "there is no such day" is an ordinary 404, not an
 * exception. `DayIndex.of` would throw an `InvalidValueError`, which is the
 * right behaviour for a value the *program* constructed and the wrong one for a
 * value a stranger typed.
 *
 * The neighbours are read from the same list rather than by two more queries.
 * The course is 28 rows held in memory; a round trip per arrow would be
 * ceremony.
 */
export class GetGrammarLessonUseCase {
  constructor(private readonly lessons: IGrammarLessonRepository) {}

  async execute(input: IGetGrammarLessonInput): Promise<IGrammarLessonView | null> {
    if (!Number.isInteger(input.dayIndex)) {
      return null;
    }

    const all = await this.lessons.listAll();
    const ordered = [...all].sort((left, right) => left.day.value - right.day.value);
    const at = ordered.findIndex((lesson) => lesson.day.value === input.dayIndex);
    const lesson = ordered[at];

    if (lesson === undefined) {
      return null;
    }

    const previous = ordered[at - 1];
    const next = ordered[at + 1];

    return {
      dayIndex: lesson.day.value,
      weekIndex: lesson.weekIndex,
      level: lesson.level(),
      title: lesson.title,
      banglaTitle: lesson.banglaTitle,
      goal: lesson.goal,
      ieltsWhy: lesson.ieltsWhy,
      minutes: lesson.minutes,
      sections: lesson.sections,
      mistakes: lesson.mistakes,
      ieltsMoves: lesson.ieltsMoves,
      checks: lesson.checks,
      previous:
        previous === undefined
          ? null
          : { dayIndex: previous.day.value, title: previous.title },
      next: next === undefined ? null : { dayIndex: next.day.value, title: next.title },
    };
  }
}
