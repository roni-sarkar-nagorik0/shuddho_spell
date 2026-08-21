/**
 * The forms a learner will actually say, and the words that are not forms.
 *
 * The failure that matters here is the **false negative**: somebody puts
 * *visit* into a sentence as "I visited my friend", is told they did not use
 * the word, and concludes the product is broken. The second failure is the
 * opposite and quieter — accepting *visitor* would mean the checker is not
 * checking anything, and it would pass silently forever.
 */
import { describe, expect, it } from 'vitest';
import { formsOf, usesWordOrForm } from './inflections';

describe('the forms of a word', () => {
  it('accepts the word itself', () => {
    expect(usesWordOrForm('I visit my friend.', 'visit')).toBe(true);
  });

  it('accepts the regular endings', () => {
    expect(usesWordOrForm('I visited my friend yesterday.', 'visit')).toBe(true);
    expect(usesWordOrForm('She visits every week.', 'visit')).toBe(true);
    expect(usesWordOrForm('We are visiting tomorrow.', 'visit')).toBe(true);
  });

  it('drops the silent e before an ending', () => {
    expect(usesWordOrForm('I am hoping for good news.', 'hope')).toBe(true);
    expect(usesWordOrForm('She hoped for it.', 'hope')).toBe(true);
  });

  it('doubles the final consonant, the way the course teaches it', () => {
    expect(usesWordOrForm('The bus is stopping here.', 'stop')).toBe(true);
    expect(usesWordOrForm('They stopped at the corner.', 'stop')).toBe(true);
  });

  it('turns y into i', () => {
    expect(usesWordOrForm('She tried again.', 'try')).toBe(true);
    expect(usesWordOrForm('He tries every day.', 'try')).toBe(true);
    // But not after a vowel — play stays play.
    expect(formsOf('play')).toContain('played');
    expect(formsOf('play')).not.toContain('plaied');
  });

  it('adds es to the words that need it', () => {
    expect(usesWordOrForm('I wash the dishes.', 'dish')).toBe(true);
    expect(usesWordOrForm('He sees three buses.', 'bus')).toBe(true);
  });

  it('refuses a different word that merely starts the same way', () => {
    expect(usesWordOrForm('She is a visitor here.', 'visit')).toBe(false);
    expect(usesWordOrForm('I will revisit it later.', 'visit')).toBe(false);
    expect(usesWordOrForm('He turned the handle.', 'hand')).toBe(false);
  });

  it('refuses a word that merely ends the same way', () => {
    expect(usesWordOrForm('I knew it beforehand.', 'hand')).toBe(false);
  });

  it('does not guess at irregular forms', () => {
    // *went* is not derivable from *go* by any rule, and pretending otherwise
    // would mean guessing. The caller reports "not recognised", not "wrong".
    expect(usesWordOrForm('I went home.', 'go')).toBe(false);
  });

  it('refuses an empty word rather than matching every sentence', () => {
    expect(usesWordOrForm('Anything at all.', '')).toBe(false);
    expect(formsOf('   ')).toEqual([]);
  });
});
