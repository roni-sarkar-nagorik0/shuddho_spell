/**
 * What one word did to another to become itself.
 *
 * Every case here is a claim the screen prints beside a word. A wrong label is
 * not a cosmetic fault: `stopping` reported as `stop + ping` teaches a suffix
 * English does not have, under a heading that says "the rule".
 */
import { describe, expect, it } from 'vitest';
import { changeBetween } from './form-change';

describe('changeBetween', () => {
  it('names a plain suffix', () => {
    expect(changeBetween('work', 'worker')).toEqual({
      kind: 'suffix',
      prefix: null,
      suffix: 'er',
      reversesMeaning: false,
    });
  });

  it('reads a doubled consonant as doubling, not as a longer suffix', () => {
    // `stopping` starts with `stop`, so a plain-suffix reading would report the
    // suffix as `ping`. Order of the tests inside `suffixChange` is what stops
    // that, and this is the case that proves the order.
    expect(changeBetween('stop', 'stopping')).toEqual({
      kind: 'doubled',
      prefix: null,
      suffix: 'ing',
      reversesMeaning: false,
    });
  });

  it('names y to i', () => {
    expect(changeBetween('happy', 'happiness')).toMatchObject({ kind: 'y-to-i', suffix: 'ness' });
    expect(changeBetween('study', 'studies')).toMatchObject({ kind: 'y-to-i', suffix: 'es' });
  });

  it('keeps the y before -ing, and says so', () => {
    // `studying` keeps its y, and that is the exception the rule needs. Calling
    // it y-to-i here would teach the rule without its limit.
    expect(changeBetween('study', 'studying')).toMatchObject({ kind: 'suffix', suffix: 'ing' });
  });

  it('names a dropped silent e', () => {
    expect(changeBetween('educate', 'education')).toMatchObject({ kind: 'drop-e', suffix: 'ion' });
    expect(changeBetween('analyse', 'analysis')).toMatchObject({ kind: 'drop-e', suffix: 'is' });
  });

  it('strips a prefix and then names the change underneath it', () => {
    // A single pass calls this irregular, which hides the rule on exactly the
    // words where a learner can least see it.
    expect(changeBetween('happy', 'unhappiness')).toEqual({
      kind: 'y-to-i',
      prefix: 'un',
      suffix: 'ness',
      reversesMeaning: true,
    });
  });

  it('marks a reversing prefix apart from a shading one', () => {
    expect(changeBetween('employ', 'unemployed').reversesMeaning).toBe(true);
    expect(changeBetween('write', 'rewrite').reversesMeaning).toBe(false);
  });

  it('prefers the longest prefix', () => {
    // `in` is a prefix of `inter`. Testing `in` first would read
    // `international` as `in-` plus `ternational`, which relates to no root.
    expect(changeBetween('nation', 'international')).toMatchObject({ prefix: 'inter' });
  });

  it('refuses a prefix when the remainder does not relate to the root', () => {
    // Otherwise every word beginning with two familiar letters grows a prefix.
    expect(changeBetween('interpret', 'interpretation')).toMatchObject({
      kind: 'suffix',
      prefix: null,
      suffix: 'ation',
    });
  });

  it('says irregular rather than inventing a rule', () => {
    expect(changeBetween('speak', 'spoke')).toEqual({
      kind: 'irregular',
      prefix: null,
      suffix: null,
      reversesMeaning: false,
    });
    expect(changeBetween('teach', 'taught').kind).toBe('irregular');
  });
});
