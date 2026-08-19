import { type IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { type PhonemeType } from '../value-objects/phoneme-type';

/**
 * One English sound, annotated for a Bengali speaker.
 *
 * The 44 of these are the spine of the pronunciation half of the product.
 */
export class Phoneme {
  constructor(
    readonly id: string,
    readonly symbol: IpaTranscription,
    readonly type: PhonemeType,
    /**
     * Null means Bangla has no such sound. That is data, not a gap — 002 says
     * so in a comment and `isAbsentFromBangla()` is what stops the next reader
     * treating it as "not filled in yet".
     */
    readonly banglaEquivalent: string | null,
    readonly articulationNote: string,
    /** What learners produce instead. Only meaningful when the sound is absent. */
    readonly commonBengaliSubstitution: string | null,
  ) {}

  /**
   * The sounds English has and Bangla does not — /v/, /θ/, /ð/, /z/ and the
   * rest. These are where a Bengali speaker's accent actually lives, so the
   * lesson and the mastery matrix both need to single them out.
   */
  isAbsentFromBangla(): boolean {
    return this.banglaEquivalent === null;
  }

  /**
   * Whether this phoneme has a documented substitution to teach against. A
   * sound absent from Bangla with nobody having recorded what replaces it is
   * a content gap, and the lesson has nothing to say about it.
   */
  hasKnownSubstitution(): boolean {
    return this.commonBengaliSubstitution !== null;
  }
}
