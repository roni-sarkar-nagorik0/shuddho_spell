/**
 * The word-family page: what it counts, what it filters, and the two numbers
 * that must never be the same number.
 */
import { describe, expect, it } from 'vitest';
import { RuleFamily } from '../../domain/entities/rule-family';
import { WordFamily } from '../../domain/entities/word-family';
import { type ICourseWordIndex } from '../../domain/repositories/course-word-index';
import { type IRuleFamilyRepository } from '../../domain/repositories/rule-family-repository';
import { type IWordFamilySource } from '../../domain/repositories/word-family-source';
import { GetWordFamiliesUseCase } from './get-word-families';

const Y_TO_I = new RuleFamily(
  'rule-1',
  'y_to_i',
  'When a word ends in a consonant plus y, change the y to i before a suffix.',
  ['happy + er = happier', 'carry + ed = carried', 'beauty + ful = beautiful'],
  ['play + ed = played, because the y follows a vowel', 'shy + ly = shyly'],
);

function family(input: {
  readonly root: string;
  readonly topic?: string;
  readonly skills?: readonly ('speaking' | 'writing' | 'listening' | 'reading')[];
  readonly rule?: string | null;
  readonly members?: readonly string[];
}): WordFamily {
  return WordFamily.create({
    root: input.root,
    banglaMeaning: 'অর্থ',
    ruleFamily: input.rule === undefined ? 'y_to_i' : input.rule,
    skills: input.skills ?? ['writing'],
    topic: input.topic ?? 'education',
    members: (input.members ?? [`${input.root}ness`, `${input.root}ly`]).map((text) => ({
      text,
      partOfSpeech: 'noun',
    })),
  });
}

function useCase(
  families: readonly WordFamily[],
  options: {
    readonly rules?: readonly RuleFamily[];
    readonly course?: readonly string[];
  } = {},
): GetWordFamiliesUseCase {
  const source: IWordFamilySource = { listAll: () => families };
  const rules: IRuleFamilyRepository = {
    listAll: () => Promise.resolve(options.rules ?? [Y_TO_I]),
    findByIds: () => Promise.reject(new Error('the family page never asks for rules by id')),
  };
  const taught = new Set(options.course ?? []);
  const course: ICourseWordIndex = { has: (word) => taught.has(word), size: taught.size };

  return new GetWordFamiliesUseCase(source, rules, course);
}

describe('GetWordFamiliesUseCase', () => {
  it('counts distinct words, not the sum of family sizes', async () => {
    const page = await useCase([
      family({ root: 'happy', members: ['happier', 'happiest'] }),
      family({ root: 'carry', members: ['carried', 'carries'] }),
    ]).execute({ pageSize: 10 });

    expect(page.totalWords).toBe(6);
    expect(page.totalFamilies).toBe(2);
  });

  it('reports the matched set and the whole corpus as two different numbers', async () => {
    // Both are on the screen at once and they answer different questions. A
    // page showing only the matched figure reads as a far smaller product.
    const page = await useCase([
      family({ root: 'happy', topic: 'emotion' }),
      family({ root: 'carry', topic: 'work' }),
      family({ root: 'study', topic: 'work' }),
    ]).execute({ pageSize: 10, topic: 'work' });

    expect(page.matchedFamilies).toBe(2);
    expect(page.totalFamilies).toBe(3);
    expect(page.matchedWords).toBeLessThan(page.totalWords);
  });

  it('indexes topics over the whole corpus, never over the filtered set', async () => {
    // The index is navigation. A door that vanishes because the current filter
    // excluded it is a door the learner cannot find their way back through.
    const page = await useCase([
      family({ root: 'happy', topic: 'emotion' }),
      family({ root: 'carry', topic: 'work' }),
    ]).execute({ pageSize: 10, topic: 'work' });

    expect(page.topics.map((entry) => entry.topic).sort()).toEqual(['emotion', 'work']);
  });

  it('filters by paper', async () => {
    const page = await useCase([
      family({ root: 'happy', skills: ['speaking'] }),
      family({ root: 'carry', skills: ['writing', 'reading'] }),
    ]).execute({ pageSize: 10, skill: 'speaking' });

    expect(page.families.map((entry) => entry.root)).toEqual(['happy']);
  });

  it('matches the start of a word, not any part of it', async () => {
    // Substring matching answers `art` with `department` and buries the family
    // the learner meant.
    const page = await useCase([
      family({ root: 'art', members: ['artist', 'artistic'] }),
      family({ root: 'depart', members: ['department', 'departure'] }),
    ]).execute({ pageSize: 10, startsWith: 'art' });

    expect(page.families.map((entry) => entry.root)).toEqual(['art']);
  });

  it('finds a family by one of its forms, not only by its root', async () => {
    const page = await useCase([family({ root: 'happy', members: ['happiness', 'happily'] })]).execute(
      { pageSize: 10, startsWith: 'happin' },
    );

    expect(page.families.map((entry) => entry.root)).toEqual(['happy']);
  });

  it('pages forward from the cursor and stops', async () => {
    const corpus = ['aa', 'bb', 'cc', 'dd'].map((root) => family({ root }));

    const first = await useCase(corpus).execute({ pageSize: 2 });
    expect(first.families.map((entry) => entry.root)).toEqual(['aa', 'bb']);
    expect(first.nextCursor).toBe('bb');

    const second = await useCase(corpus).execute({ pageSize: 2, after: 'bb' });
    expect(second.families.map((entry) => entry.root)).toEqual(['cc', 'dd']);
    expect(second.nextCursor).toBeNull();
  });

  it('spells out the rule rather than printing its code', async () => {
    const page = await useCase([family({ root: 'happy' })]).execute({ pageSize: 10 });

    expect(page.families[0]?.ruleStatement).toBe(Y_TO_I.statement);
  });

  it('reports no statement rather than the raw code when a rule is missing', async () => {
    // A code with nothing behind it is a content bug. Printing `y_to_i` as a
    // heading dresses the bug up as something a learner should read.
    const page = await useCase([family({ root: 'happy' })], { rules: [] }).execute({ pageSize: 10 });

    expect(page.families[0]?.ruleStatement).toBeNull();
    expect(page.families[0]?.ruleFamilyCode).toBe('y_to_i');
  });

  it('offers only the rules the corpus actually demonstrates', async () => {
    const other = new RuleFamily(
      'rule-2',
      'fewer_less',
      'Use fewer for things you can count and less for things you cannot.',
      ['fewer cars', 'less traffic', 'fewer people'],
      ['less than five miles, where the measure is a quantity', 'less than 10%'],
    );

    const page = await useCase([family({ root: 'happy' })], { rules: [Y_TO_I, other] }).execute({
      pageSize: 10,
    });

    // A filter that always returns nothing makes the screen look broken in the
    // one place it is working correctly.
    expect(page.rules.map((rule) => rule.code)).toEqual(['y_to_i']);
  });

  it('marks the words the 28-day course also teaches', async () => {
    const page = await useCase([family({ root: 'happy', members: ['happiness', 'happily'] })], {
      course: ['happy', 'happiness'],
    }).execute({ pageSize: 10 });

    expect(page.families[0]?.inCourseCount).toBe(2);
    expect(page.families[0]?.members.map((member) => member.inCourse)).toEqual([true, false]);
  });

  it('caps the page size whatever the query string says', async () => {
    const corpus = Array.from({ length: 80 }, (_, index) =>
      family({ root: `root${String(index).padStart(2, '0')}` }),
    );

    const page = await useCase(corpus).execute({ pageSize: 500 });

    expect(page.families.length).toBe(60);
  });
});
