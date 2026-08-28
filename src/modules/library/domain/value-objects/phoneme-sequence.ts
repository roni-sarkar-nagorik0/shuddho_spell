/**
 * One phoneme of a word, in the position the word says it.
 *
 * `phonemeId` is nullable because the inventory is the 44 phonemes of 002 and
 * a transcription can legitimately carry a symbol that is not one of them — a
 * length mark on a vowel the content team wrote separately, a syllable break.
 * Null means "sound we can score but cannot credit to a mastery row", which is
 * different from "sound we do not know", and the difference matters: the
 * scorer still compares it, the mastery write-through skips it.
 */
export interface IPhonemeSlot {
  /** 0-based, matching `word_phonemes.position`. */
  readonly position: number;
  /** Bare IPA, no delimiters and no stress mark — the mark lives below. */
  readonly symbol: string;
  readonly phonemeId: string | null;
  /** Carries the primary stress mark that preceded it in the transcription. */
  readonly isStressed: boolean;
}

/**
 * A word's sounds, in order — the G2P result.
 *
 * `07-speech-scoring.md` is explicit that runtime grapheme-to-phoneme for
 * English is a research project and that the mapping for the programme's 3,000
 * words is **stored**, not computed. This is the shape that stored mapping
 * takes once it is read back: an ordered sequence, resolvable for every seeded
 * word, which is what per-phoneme scoring and per-phoneme mastery both consume.
 */
export class PhonemeSequence {
  constructor(readonly slots: readonly IPhonemeSlot[]) {}

  static empty(): PhonemeSequence {
    return new PhonemeSequence([]);
  }

  get length(): number {
    return this.slots.length;
  }

  isEmpty(): boolean {
    return this.slots.length === 0;
  }

  symbols(): readonly string[] {
    return this.slots.map((slot) => slot.symbol);
  }

  /**
   * The ids the mastery matrix can actually write to. Slots with no id are
   * dropped rather than defaulted — a mastery row under a made-up id is worse
   * than an absent one.
   */
  phonemeIds(): readonly string[] {
    return this.slots.flatMap((slot) => (slot.phonemeId === null ? [] : [slot.phonemeId]));
  }

  /**
   * Where the primary stress falls, or null when the transcription does not
   * mark it. First-syllable stress errors are one of the confusions
   * `07-speech-scoring.md` names, and they are invisible without this.
   */
  stressedPosition(): number | null {
    const index = this.slots.findIndex((slot) => slot.isStressed);

    return index === -1 ? null : index;
  }
}
