import { type Word } from '../entities/word';
import { type IpaSegmenter } from './ipa-segmenter';
import { PhonemeSequence, type IPhonemeSlot } from '../value-objects/phoneme-sequence';
import { type IWordPhonemeLink } from '../value-objects/word-phoneme-link';

/**
 * A word's phoneme sequence, from what is stored.
 *
 * Two stored things say it, and they say different halves. `words.ipa` carries
 * the sounds **and the stress**, which is what the scorer compares. The
 * `word_phonemes` rows carry the **phoneme ids**, which is what mastery writes
 * against — 002's own comment says the join table exists for exactly that.
 *
 * So the transcription decides the shape of the sequence and the join table
 * decides identity within it. The join table wins on ids where it has an
 * opinion, because it is the curated one; where it is silent — content seeded
 * before Phase 9 joins it up — the symbol still resolves through the inventory
 * and the word is scorable anyway. That fallback is the whole reason every
 * seeded word resolves to a sequence rather than most of them.
 */
export class WordPhonemeResolver {
  constructor(private readonly segmenter: IpaSegmenter) {}

  resolve(word: Word, links: readonly IWordPhonemeLink[]): PhonemeSequence {
    const derived = this.segmenter.segment(word.ipa);

    const curated = new Map<number, string>();

    for (const link of links) {
      if (link.wordId === word.id) {
        curated.set(link.position, link.phonemeId);
      }
    }

    if (curated.size === 0) {
      return derived;
    }

    return new PhonemeSequence(
      derived.slots.map(
        (slot): IPhonemeSlot => ({
          ...slot,
          phonemeId: curated.get(slot.position) ?? slot.phonemeId,
        }),
      ),
    );
  }
}
