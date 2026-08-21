import { GRAMMAR_DAYS } from '../../../../../../content/grammar/index';
import { type GrammarDayEntry } from '../../../../../../content/grammar/schema';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { GrammarLesson } from '../../../domain/entities/grammar-lesson';
import { type IGrammarLessonRepository } from '../../../domain/repositories/grammar-lesson-repository';

/**
 * The course, read from the typed content files.
 *
 * **Not** Postgres, and that is a deliberate exception to how every other
 * content type in this project is served. The corpus is seeded into tables
 * because learner rows point at it — `attempts.item_id`, `review_items`,
 * `mastery_records` — so a word needs a stable uuid that survives an edit. No
 * row anywhere points at a grammar day. It is prose, versioned in git, read the
 * same way on every request, identical for every learner.
 *
 * What that buys: no migration, no seed step, no RLS policy, and no way for the
 * screen to disagree with the file. What it costs: editing the course is a
 * deploy. That is the right trade for teaching material, and the port above is
 * what makes it reversible if it stops being.
 *
 * The relative import is because `content/` sits outside `src/` and therefore
 * outside the `@/*` alias. It is the same directory `scripts/content-seed.ts`
 * reads, which is the point — one source for the course.
 */
export class ContentGrammarLessonRepository implements IGrammarLessonRepository {
  listAll(): Promise<readonly GrammarLesson[]> {
    return Promise.resolve(GRAMMAR_DAYS.map(toLesson));
  }

  findByDay(day: DayIndex): Promise<GrammarLesson | null> {
    const found = GRAMMAR_DAYS.find((entry) => entry.dayIndex === day.value);

    return Promise.resolve(found === undefined ? null : toLesson(found));
  }
}

/**
 * Content entry to entity.
 *
 * The two shapes are close but not the same, and the difference is `undefined`
 * against `null`: Zod's `.optional()` produces the first, and this codebase's
 * domain uses the second everywhere. Mapping rather than passing the entry
 * through is also what stops the entity growing a dependency on Zod's inferred
 * types.
 */
function toLesson(entry: GrammarDayEntry): GrammarLesson {
  return new GrammarLesson(
    DayIndex.of(entry.dayIndex),
    entry.title,
    entry.banglaTitle,
    entry.goal,
    entry.ieltsWhy,
    entry.minutes,
    entry.sections.map((section) => ({
      heading: section.heading,
      plain: section.plain,
      bangla: section.bangla,
      examples: section.examples.map((example) => ({
        english: example.english,
        note: example.note ?? null,
      })),
      table:
        section.table === undefined
          ? null
          : {
              caption: section.table.caption,
              headers: section.table.headers,
              rows: section.table.rows,
            },
    })),
    entry.mistakes,
    entry.ieltsMoves,
    entry.checks,
  );
}
