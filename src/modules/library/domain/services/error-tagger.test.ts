/**
 * F4.8's acceptance criterion: **every named tag is produced by a real wrong
 * answer** — the errors a Bengali speaker actually makes, not shapes invented
 * to satisfy a regex.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0). This file exists
 * because the criterion is a claim about behaviour that reading the code cannot
 * settle: a heuristic tagger that silently fires on nothing typechecks
 * perfectly and makes the product a quiz again.
 */
import { describe, expect, it } from 'vitest';
import { ERROR_TAGS, type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';
import { ErrorTagger } from './error-tagger';

const tagger = new ErrorTagger();

const SPELLING: readonly (readonly [ErrorTag, string, string])[] = [
  ['DOUBLE_CONSONANT', 'running', 'runing'],
  ['SILENT_LETTER', 'knife', 'nife'],
  ['V_W_SUBSTITUTION', 'very', 'wery'],
  ['Y_TO_I', 'studies', 'studys'],
  ['TION_SION', 'nation', 'nashion'],
];

const SENTENCE: readonly (readonly [ErrorTag, string, string])[] = [
  ['ARTICLE_MISSING', 'I bought a book', 'I bought book'],
  ['PREPOSITION_WRONG', 'He is at home', 'He is in home'],
  ['WORD_ORDER', 'I am going home', 'I going am home'],
  ['TENSE_MISMATCH', 'She walked home', 'She walking home'],
];

describe('every tag is reachable from a real wrong answer', () => {
  for (const [tag, target, submitted] of SPELLING) {
    it(`${tag}: "${target}" written "${submitted}"`, () => {
      expect(tagger.tagSpelling(target, submitted)).toContain(tag);
    });
  }

  for (const [tag, target, submitted] of SENTENCE) {
    it(`${tag}: "${target}" built "${submitted}"`, () => {
      expect(tagger.tagSentence(target, submitted)).toContain(tag);
    });
  }

  it('covers all nine — a tag no wrong answer can produce is a dead category', () => {
    const covered = new Set([...SPELLING, ...SENTENCE].map(([tag]) => tag));

    expect([...ERROR_TAGS].filter((tag) => !covered.has(tag))).toEqual([]);
  });
});

describe('it says nothing rather than something wrong', () => {
  it('tags a correct answer with nothing at all', () => {
    expect(tagger.tagSpelling('water', 'Water ')).toEqual([]);
    expect(tagger.tagSentence('I am going home', 'i am going home')).toEqual([]);
  });

  it('returns no tag for a wrong answer it does not recognise', () => {
    expect(tagger.tagSpelling('water', 'elephant')).toEqual([]);
  });

  it('reports word order alone, not four tags for one mistake', () => {
    expect(tagger.tagSentence('I go to the shop', 'I to go the shop')).toEqual(['WORD_ORDER']);
  });
});
