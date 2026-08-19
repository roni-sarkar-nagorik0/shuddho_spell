import { InvalidValueError } from '@/modules/shared/domain/errors/invalid-value.error';
import { normaliseAnswer } from '@/modules/shared/domain/text/normalise-answer';
import { type IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { type PartOfSpeech } from '../value-objects/part-of-speech';

/**
 * One of the 1,240 words, with everything a Bengali speaker needs to spell it,
 * say it and know what it means.
 *
 * `commonMisspellings` is the field that makes a wrong answer diagnostic rather
 * than merely wrong: it is what a learner actually types, collected per word,
 * and the dictation stage tags against it.
 */
export class Word {
  constructor(
    readonly id: string,
    readonly text: string,
    readonly ipa: IpaTranscription,
    readonly syllables: readonly string[],
    /** Bangla-script approximation of the sound, for the learn stage. */
    readonly banglaSound: string,
    readonly banglaMeaning: string,
    readonly partOfSpeech: PartOfSpeech,
    /** Null: a word need not demonstrate a rule. */
    readonly ruleFamilyId: string | null,
    readonly weekIndex: number,
    /** Null when the word is not in the frequency list. */
    readonly frequencyRank: number | null,
    readonly commonMisspellings: readonly string[],
  ) {
    // 002's `words_syllables_not_empty`. A word with no syllables cannot be
    // taught in the learn stage, which walks them one at a time.
    if (syllables.length === 0) {
      throw new InvalidValueError('Word', `"${text}" with no syllables`, 'must have at least one');
    }
  }

  /**
   * Whether a learner's typing is this word. Case and whitespace are forgiven;
   * letters are not.
   */
  matches(candidate: string): boolean {
    return normaliseAnswer(candidate) === normaliseAnswer(this.text);
  }

  /**
   * Whether a wrong answer is a *known* wrong answer — one this word's content
   * anticipated. A hit means the lesson can say what went wrong instead of only
   * that something did; a miss is a novel error worth surfacing to content.
   */
  isKnownMisspelling(candidate: string): boolean {
    const normalised = normaliseAnswer(candidate);

    return this.commonMisspellings.some((m) => normaliseAnswer(m) === normalised);
  }
}
