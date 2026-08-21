import { describe, expect, it } from 'vitest';
import { GRAMMAR_DAYS } from '../../../../../content/grammar/index';
import { validateGrammar } from '../../../../../content/grammar/index';
import { ContentGrammarLessonRepository } from '../../infrastructure/persistence/content/grammar-lesson.repository';
import { GetGrammarLessonUseCase } from './get-grammar-lesson';
import { GetGrammarSyllabusUseCase } from './get-grammar-syllabus';

const lessons = new ContentGrammarLessonRepository();

describe('the grammar course as content', () => {
  it('is valid, with no gaps and no duplicate days', () => {
    const { issues, counts } = validateGrammar();

    expect(issues, 'content issues').toStrictEqual([]);
    expect(counts.days).toBe(28);
  });

  it('teaches something on every one of the 28 days', () => {
    // The schema enforces the minimums per entry; this is the course-level
    // claim the syllabus screen makes on the learner's behalf.
    for (const day of GRAMMAR_DAYS) {
      expect(day.sections.length, `day ${String(day.dayIndex)} sections`).toBeGreaterThanOrEqual(3);
      expect(day.checks.length, `day ${String(day.dayIndex)} checks`).toBeGreaterThanOrEqual(3);
      expect(day.mistakes.length, `day ${String(day.dayIndex)} mistakes`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('GetGrammarSyllabus', () => {
  it('groups the course into four weeks of seven', async () => {
    const syllabus = await new GetGrammarSyllabusUseCase(lessons).execute();

    expect(syllabus.weeks.map((week) => week.days.length)).toStrictEqual([7, 7, 7, 7]);
    expect(syllabus.totalDays).toBe(28);
  });

  it('labels the weeks basic to advanced, in that order', async () => {
    const syllabus = await new GetGrammarSyllabusUseCase(lessons).execute();

    expect(syllabus.weeks.map((week) => week.level)).toStrictEqual([
      'basic',
      'building',
      'strong',
      'advanced',
    ]);
  });
});

describe('GetGrammarLesson', () => {
  const useCase = new GetGrammarLessonUseCase(lessons);

  it('returns the day asked for, with the days either side of it', async () => {
    const lesson = await useCase.execute({ dayIndex: 16 });

    expect(lesson?.dayIndex).toBe(16);
    expect(lesson?.previous?.dayIndex).toBe(15);
    expect(lesson?.next?.dayIndex).toBe(17);
  });

  it('has no previous day at the start and no next day at the end', async () => {
    const first = await useCase.execute({ dayIndex: 1 });
    const last = await useCase.execute({ dayIndex: 28 });

    expect(first?.previous).toBeNull();
    expect(last?.next).toBeNull();
  });

  it('answers null for anything that is not a day, rather than throwing', async () => {
    // The only caller is a URL segment, so these are the values it will
    // actually receive. `DayIndex.of` would throw on all four.
    for (const dayIndex of [0, 29, -3, 2.5]) {
      await expect(useCase.execute({ dayIndex })).resolves.toBeNull();
    }
  });
});
