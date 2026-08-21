/**
 * `contains`, which is the only thing standing between the landing page and an
 * example of the wrong word.
 *
 * A database can be asked for `english_text ilike '%hand%'` and nothing more
 * precise. Every case below is a row that query really returns, and only one of
 * them is a sentence about a hand.
 */
import { describe, expect, it } from 'vitest';
import { SentenceItem } from './sentence-item';

function sentence(english: string): SentenceItem {
  return new SentenceItem('s-1', 'বাংলা।', english, [], [], [], 'easy');
}

describe('a sentence item knows which words it uses', () => {
  it('finds the word', () => {
    expect(sentence('The book is in my hand.').contains('hand')).toBe(true);
  });

  it('finds it as the first word, capitalised', () => {
    expect(sentence('Hand me the book.').contains('hand')).toBe(true);
  });

  it('finds it before a comma, a full stop or a question mark', () => {
    expect(sentence('Give me your hand, please.').contains('hand')).toBe(true);
    expect(sentence('Is that your hand?').contains('hand')).toBe(true);
  });

  it('refuses a word that merely starts the same way', () => {
    expect(sentence('She turned the handle.').contains('hand')).toBe(false);
  });

  it('refuses a word that merely ends the same way', () => {
    expect(sentence('He knew it beforehand.').contains('hand')).toBe(false);
    expect(sentence('I can write shorthand.').contains('hand')).toBe(false);
  });

  it('does not reach inside a contraction', () => {
    // The apostrophe is a word character here, so "don't" is one word and `t`
    // is not a word inside it.
    expect(sentence("I don't know.").contains('t')).toBe(false);
    expect(sentence("I don't know.").contains('know')).toBe(true);
  });

  it('refuses an empty word rather than matching everything', () => {
    expect(sentence('Anything at all.').contains('')).toBe(false);
    expect(sentence('Anything at all.').contains('   ')).toBe(false);
  });

  it('splits the sentence the same way it searches it', () => {
    expect(sentence('Give me your hand, please.').words()).toEqual([
      'give',
      'me',
      'your',
      'hand',
      'please',
    ]);
  });
});
