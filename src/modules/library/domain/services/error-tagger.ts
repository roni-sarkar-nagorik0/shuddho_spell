import { normaliseAnswer } from '@/modules/shared/domain/text/normalise-answer';
import { type ErrorTag } from '@/modules/shared/domain/value-objects/error-tag';

/**
 * Function words. Closed classes — grammar, not content, so listing them here
 * is describing English rather than inventing course material.
 */
const ARTICLES: readonly string[] = Object.freeze(['a', 'an', 'the']);

const PREPOSITIONS: readonly string[] = Object.freeze([
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
  'by', 'down', 'during', 'for', 'from', 'in', 'inside', 'into', 'near', 'of',
  'off', 'on', 'onto', 'out', 'outside', 'over', 'past', 'since', 'through',
  'throughout', 'to', 'towards', 'under', 'until', 'up', 'upon', 'with',
  'within', 'without',
]);

/**
 * Spellings where a letter is written and not sounded. Each entry is the
 * cluster as spelled and the letter a learner drops when they spell what they
 * hear — `knife` → `nife`, `write` → `rite`, `debt` → `det`.
 */
const SILENT_LETTER_CLUSTERS: readonly (readonly [string, string])[] = Object.freeze([
  ['kn', 'n'],
  ['wr', 'r'],
  ['gn', 'n'],
  ['ps', 's'],
  ['mb', 'm'],
  ['mn', 'm'],
  ['bt', 't'],
  ['gh', ''],
  ['lk', 'k'],
  ['lm', 'm'],
  ['st', 's'],
  ['rh', 'r'],
]);

/**
 * `y` becomes `i` before these endings, and a learner who has not met the rule
 * writes the `y`. Longest first: `iest` must be tried before `ies`, or
 * `happiest` is matched as `happ` + `ies` + `t`.
 */
const Y_TO_I_PAIRS: readonly (readonly [string, string])[] = Object.freeze([
  ['iness', 'yness'],
  ['iest', 'yest'],
  ['iful', 'yful'],
  ['ies', 'ys'],
  ['ied', 'yed'],
  ['ier', 'yer'],
]);

/** Tense markers that differ only by suffix on a shared stem. */
const TENSE_SUFFIXES: readonly string[] = Object.freeze(['ed', 'ing', 's', 'es', 'd']);

const DOUBLE_CONSONANT = /([bcdfgklmnprstvz])\1/u;
const TION_SION = /(tion|sion|cion)/u;

/**
 * What a wrong answer was wrong *about*.
 *
 * This is the service that makes the product diagnostic. A boolean tells a
 * learner they failed; `V_W_SUBSTITUTION` tells them they wrote "wery" for
 * "very", which is the single most predictable Bengali-speaker error in English
 * and the thing the mastery matrix is built to surface.
 *
 * **These are heuristics and they are honest about it.** Each rule fires on a
 * shape that is characteristic of the error, not on a proof of it, and the
 * tagger prefers to say nothing over saying something wrong: an unrecognised
 * wrong answer returns no tags rather than a guess. An untagged error is a gap
 * in coverage the content team can see; a mis-tagged one teaches the learner
 * the wrong lesson, which is worse than teaching them nothing.
 *
 * Nothing here is invented linguistic content. The word lists are closed
 * grammatical classes, and the clusters are orthographic facts about English
 * spelling.
 */
export class ErrorTagger {
  /**
   * Tags a misspelling, comparing letter by letter against the target.
   *
   * Order matters only in that every rule is independent — a single wrong
   * answer can carry several tags, and usually should. "wriing" for "writing"
   * is both a silent-letter miss and a doubling error, and telling the learner
   * only one of those leaves them to fail on the other.
   */
  tagSpelling(target: string, submitted: string): readonly ErrorTag[] {
    const want = normaliseAnswer(target);
    const got = normaliseAnswer(submitted);

    if (want === got) {
      return [];
    }

    const tags = new Set<ErrorTag>();

    if (this.hasVwSubstitution(want, got)) {
      tags.add('V_W_SUBSTITUTION');
    }

    if (this.hasDoublingError(want, got)) {
      tags.add('DOUBLE_CONSONANT');
    }

    if (this.hasSilentLetterDrop(want, got)) {
      tags.add('SILENT_LETTER');
    }

    if (this.hasYToIError(want, got)) {
      tags.add('Y_TO_I');
    }

    if (this.hasTionSionError(want, got)) {
      tags.add('TION_SION');
    }

    return [...tags];
  }

  /**
   * Tags a wrongly constructed sentence.
   *
   * Word order is checked first and short-circuits: if the learner used exactly
   * the right words in the wrong order, every other rule would also fire — the
   * article is "missing" from where it should be, the preposition is "wrong" at
   * that position — and the learner would be handed four tags describing one
   * mistake.
   */
  tagSentence(target: string, submitted: string): readonly ErrorTag[] {
    const want = this.words(target);
    const got = this.words(submitted);

    if (want.join(' ') === got.join(' ')) {
      return [];
    }

    if (this.isReordering(want, got)) {
      return ['WORD_ORDER'];
    }

    const tags = new Set<ErrorTag>();

    if (this.hasMissingArticle(want, got)) {
      tags.add('ARTICLE_MISSING');
    }

    if (this.hasSwappedWordFrom(want, got, PREPOSITIONS)) {
      tags.add('PREPOSITION_WRONG');
    }

    if (this.hasTenseMismatch(want, got)) {
      tags.add('TENSE_MISMATCH');
    }

    return [...tags];
  }

  // --- spelling rules ------------------------------------------------------

  /** A `v` written as `w`, or a `w` as `v`, at the same position. */
  private hasVwSubstitution(want: string, got: string): boolean {
    if (want.length !== got.length) {
      return false;
    }

    // Indexed rather than spread: spreading a string splits it into code
    // points, and these words sit beside Bangla content in the same codebase.
    for (let index = 0; index < want.length; index += 1) {
      const wanted = want[index];
      const given = got[index];

      if ((wanted === 'v' && given === 'w') || (wanted === 'w' && given === 'v')) {
        return true;
      }
    }

    return false;
  }

  /** A doubled consonant written single, or a single one doubled. */
  private hasDoublingError(want: string, got: string): boolean {
    const wantDoubles = DOUBLE_CONSONANT.test(want);
    const gotDoubles = DOUBLE_CONSONANT.test(got);

    if (wantDoubles === gotDoubles) {
      return false;
    }

    // The collapse has to be what explains the difference, not a coincidence
    // between two unrelated words.
    return this.collapseDoubles(want) === this.collapseDoubles(got);
  }

  /** A written-but-unsounded letter dropped: `knife` → `nife`. */
  private hasSilentLetterDrop(want: string, got: string): boolean {
    return SILENT_LETTER_CLUSTERS.some(([cluster, spoken]) => {
      if (!want.includes(cluster)) {
        return false;
      }

      return want.replace(cluster, spoken) === got;
    });
  }

  /**
   * `studies` → `studys`, `happiest` → `happyest`.
   *
   * Reconstructs what the learner *would* have written having not applied the
   * rule, and checks whether that is what they did write. Anything else is a
   * different mistake that happens to end in `-ies`.
   */
  private hasYToIError(want: string, got: string): boolean {
    return Y_TO_I_PAIRS.some(([correct, naive]) => {
      if (!want.endsWith(correct)) {
        return false;
      }

      return want.slice(0, want.length - correct.length) + naive === got;
    });
  }

  /** `nation` → `nashion`, `decision` → `decition`. */
  private hasTionSionError(want: string, got: string): boolean {
    if (!TION_SION.test(want)) {
      return false;
    }

    // Same word up to the ending, different ending: the learner spelled the
    // sound rather than the morpheme.
    const stem = want.replace(TION_SION, '');

    return got.startsWith(stem) && got !== want;
  }

  private collapseDoubles(value: string): string {
    return value.replace(/([a-z])\1/gu, '$1');
  }

  // --- sentence rules ------------------------------------------------------

  private words(value: string): readonly string[] {
    return normaliseAnswer(value)
      .replace(/[.,!?;:]/gu, '')
      .split(' ')
      .filter((word) => word.length > 0);
  }

  /** The same words, in a different order. */
  private isReordering(want: readonly string[], got: readonly string[]): boolean {
    if (want.length !== got.length) {
      return false;
    }

    return [...want].sort().join(' ') === [...got].sort().join(' ');
  }

  private hasMissingArticle(want: readonly string[], got: readonly string[]): boolean {
    return ARTICLES.some(
      (article) => this.countOf(want, article) > this.countOf(got, article),
    );
  }

  /** A word from a closed class replaced by a different word from the same class. */
  private hasSwappedWordFrom(
    want: readonly string[],
    got: readonly string[],
    vocabulary: readonly string[],
  ): boolean {
    const dropped = want.filter((word) => vocabulary.includes(word) && !got.includes(word));
    const added = got.filter((word) => vocabulary.includes(word) && !want.includes(word));

    return dropped.length > 0 && added.length > 0;
  }

  /** The same stem carrying a different tense marker: `walked` for `walking`. */
  private hasTenseMismatch(want: readonly string[], got: readonly string[]): boolean {
    return want.some((wanted) => {
      if (got.includes(wanted)) {
        return false;
      }

      const stem = this.stemOf(wanted);

      if (stem.length === 0) {
        return false;
      }

      return got.some((given) => given !== wanted && this.stemOf(given) === stem);
    });
  }

  private stemOf(word: string): string {
    for (const suffix of TENSE_SUFFIXES) {
      if (word.length > suffix.length + 1 && word.endsWith(suffix)) {
        return word.slice(0, word.length - suffix.length);
      }
    }

    return word;
  }

  private countOf(words: readonly string[], target: string): number {
    return words.filter((word) => word === target).length;
  }
}
