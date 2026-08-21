/**
 * The word-family corpus, against the **real content**.
 *
 * A fixture would prove that 412 hand-written families behave the way a fixture
 * written to make them behave says they do. Every claim below is one the screen
 * makes to a learner or the product makes to a buyer:
 *
 * - "1,800+ IELTS words" is on the marketing surface and on the screen header.
 * - A word belongs to one root. A learner reading `development` under two
 *   different roots is being told English works a way it does not.
 * - A family that names a rule shows it. A card headed *the y becomes an i*
 *   with no word where a y became an i is a heading over nothing.
 */
import { describe, expect, it } from 'vitest';
import { validateWordFamilies, WORD_FAMILY_MINIMUM_WORDS } from '../../../../../../content/word-families/index';
import { RULE_FAMILIES } from '../../../../../../content/rule-families';
import { WordFamilyContentSource } from './word-family.source';
import { ContentCourseWordIndex } from './course-word.index';
import { IELTS_SKILLS } from '../../../domain/value-objects/ielts-skill';

const source = new WordFamilyContentSource();
const families = source.listAll();

/**
 * The three rules whose demonstration is mechanically visible.
 *
 * The other twenty-one are about which letters are chosen — `tion` against
 * `sion`, `able` against `ible` — and no comparison of two strings can tell
 * whether a family demonstrates one. Checking only what can be checked is the
 * point: a test that guessed at the other twenty-one would fail on correct
 * content and be switched off.
 */
const MECHANICAL: Readonly<Record<string, string>> = {
  y_to_i: 'y-to-i',
  drop_silent_e: 'drop-e',
  doubling_1_1_1: 'doubled',
};

describe('the word family corpus', () => {
  it('validates with no issues', () => {
    expect(validateWordFamilies().issues).toEqual([]);
  });

  it('holds at least the number of words the product claims', () => {
    const words = new Set(families.flatMap((family) => family.words));

    expect(words.size).toBeGreaterThanOrEqual(WORD_FAMILY_MINIMUM_WORDS);
  });

  it('gives every word exactly one family', () => {
    const owner = new Map<string, string>();
    const shared: string[] = [];

    for (const family of families) {
      for (const word of family.words) {
        const claimed = owner.get(word);

        if (claimed === undefined) {
          owner.set(word, family.root);
        } else {
          shared.push(`${word} — ${claimed} and ${family.root}`);
        }
      }
    }

    expect(shared).toEqual([]);
  });

  it('names only rules that exist', () => {
    const codes = new Set(RULE_FAMILIES.map((rule) => rule.code));
    const unknown = families
      .filter((family) => family.ruleFamily !== null && !codes.has(family.ruleFamily))
      .map((family) => `${family.root} → ${String(family.ruleFamily)}`);

    expect(unknown).toEqual([]);
  });

  it('shows every mechanical rule it names', () => {
    const empty = families
      .filter((family) => family.ruleFamily !== null && MECHANICAL[family.ruleFamily] !== undefined)
      .filter(
        (family) =>
          !family.members.some(
            (member) => member.change.kind === MECHANICAL[family.ruleFamily ?? ''],
          ),
      )
      .map((family) => `${family.root} claims ${String(family.ruleFamily)}`);

    expect(empty, 'these families head a card with a rule none of their words shows').toEqual([]);
  });

  it('tags every family with at least one paper, drawn from the four', () => {
    const wrong = families
      .filter(
        (family) =>
          family.skills.length === 0 ||
          family.skills.some((skill) => !IELTS_SKILLS.includes(skill)),
      )
      .map((family) => family.root);

    expect(wrong).toEqual([]);
  });

  it('is mostly vocabulary the 28-day course does not already teach', () => {
    // The two corpora are separate on purpose. If the overlap were most of the
    // corpus, this screen would be the library with extra steps rather than
    // 1,800 new words — and the product's claim would be double counting.
    const course = new ContentCourseWordIndex();
    const words = new Set(families.flatMap((family) => family.words));
    const shared = [...words].filter((word) => course.has(word));

    expect(shared.length).toBeLessThan(words.size / 2);
    // ...and not zero, because the `course` mark on a member is a real feature
    // and a corpus that never triggered it would render it dead.
    expect(shared.length).toBeGreaterThan(0);
  });

  it('derives the change once, at construction, and hands out the same objects', () => {
    // 1,887 derivations per request would be the same answer computed again.
    expect(source.listAll()).toBe(families);
  });
});
