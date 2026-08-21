import { type GrammarLesson } from '../../domain/entities/grammar-lesson';
import { type IGrammarLessonRepository } from '../../domain/repositories/grammar-lesson-repository';
import {
  type IGrammarSyllabus,
  type IGrammarSyllabusWeek,
} from '../dto/grammar-syllabus';

/**
 * The whole course as a list, grouped into its four weeks.
 *
 * Grouping happens here rather than on the screen because the week is a fact
 * about the course — day 8 begins week 2 whoever is asking — and a second
 * caller that grouped it differently would be showing a different course.
 */
export class GetGrammarSyllabusUseCase {
  constructor(private readonly lessons: IGrammarLessonRepository) {}

  async execute(): Promise<IGrammarSyllabus> {
    const all = await this.lessons.listAll();
    const ordered = [...all].sort((left, right) => left.day.value - right.day.value);
    const byWeek = new Map<number, GrammarLesson[]>();

    for (const lesson of ordered) {
      const week = byWeek.get(lesson.weekIndex) ?? [];

      week.push(lesson);
      byWeek.set(lesson.weekIndex, week);
    }

    const weeks: IGrammarSyllabusWeek[] = [...byWeek.entries()]
      .sort(([left], [right]) => left - right)
      .map(([weekIndex, lessons]) => ({
        weekIndex,
        // Every lesson in a week has the same level, because both are derived
        // from the same day index. The first one is not a sample — it is the
        // answer.
        level: lessons[0]?.level() ?? 'basic',
        minutes: lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
        days: lessons.map((lesson) => ({
          dayIndex: lesson.day.value,
          title: lesson.title,
          banglaTitle: lesson.banglaTitle,
          goal: lesson.goal,
          minutes: lesson.minutes,
        })),
      }));

    return {
      weeks,
      totalDays: ordered.length,
      totalMinutes: ordered.reduce((sum, lesson) => sum + lesson.minutes, 0),
    };
  }
}
