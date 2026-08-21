import { WEEKS } from '../../../../../../content/index';
import { type ICourseWordIndex } from '../../../domain/repositories/course-word-index';

/**
 * The 1,240 programme words, as a set, built once at construction.
 *
 * Lower-cased on the way in. The corpus carries `February` and `Monday` with
 * their capitals — `content/schema.ts` explains why it must — and a family
 * member is always lower case, so a case-sensitive set would report `monday`
 * as untaught while the course teaches it on day 9.
 */
export class ContentCourseWordIndex implements ICourseWordIndex {
  private readonly words: ReadonlySet<string> = new Set(
    WEEKS.flatMap((week) => week.words.map((word) => word.text.toLowerCase())),
  );

  get size(): number {
    return this.words.size;
  }

  has(word: string): boolean {
    return this.words.has(word.toLowerCase());
  }
}
