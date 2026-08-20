import { type IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { type Phoneme } from '../entities/phoneme';
import { PhonemeSequence, type IPhonemeSlot } from '../value-objects/phoneme-sequence';

/** Primary and secondary stress, U+02C8 and U+02CC. */
const PRIMARY_STRESS = 'ˈ';
const SECONDARY_STRESS = 'ˌ';

/** Notation that separates sounds without being one: syllable dot, spaces. */
const SEPARATORS = new Set(['.', ' ', ' ', '-']);

/**
 * Cuts a stored transcription into the sounds it is made of.
 *
 * **This is not grapheme-to-phoneme.** G2P is the step that already happened —
 * a human wrote `ˈskuːl` into `words.ipa`, which `07-speech-scoring.md`
 * requires precisely because deriving it from `school` at runtime is a research
 * project. Cutting `ˈskuːl` into `s k uː l` is a lookup against the 44 symbols
 * of 002, and it is what makes "every seeded word resolves to a phoneme
 * sequence" true for content that has not been joined into `word_phonemes` yet.
 *
 * Longest match first, so `uː` never comes back as `u` followed by a stray
 * length mark, and `dʒ` never as `d` then `ʒ`.
 */
export class IpaSegmenter {
  private constructor(
    /** Longest first — the whole correctness of the scan depends on the order. */
    private readonly symbols: readonly string[],
    private readonly idsBySymbol: ReadonlyMap<string, string>,
  ) {}

  static fromPhonemes(phonemes: readonly Phoneme[]): IpaSegmenter {
    const ids = new Map<string, string>();

    for (const phoneme of phonemes) {
      ids.set(phoneme.symbol.value, phoneme.id);
    }

    return new IpaSegmenter(
      [...ids.keys()].sort((left, right) => right.length - left.length),
      ids,
    );
  }

  segment(ipa: IpaTranscription): PhonemeSequence {
    const source = ipa.value;
    const slots: IPhonemeSlot[] = [];
    let cursor = 0;
    let stressPending = false;

    while (cursor < source.length) {
      const rest = source.slice(cursor);
      const head = source.charAt(cursor);

      if (head === PRIMARY_STRESS) {
        stressPending = true;
        cursor += 1;
        continue;
      }

      // A secondary stress is real notation but it is not the thing a
      // first-syllable stress error moves, so it is consumed and not recorded.
      if (head === SECONDARY_STRESS || SEPARATORS.has(head)) {
        cursor += 1;
        continue;
      }

      const matched = this.symbols.find((symbol) => rest.startsWith(symbol));
      const symbol = matched ?? head;

      slots.push({
        position: slots.length,
        symbol,
        // An unmatched symbol is scored and never credited: see IPhonemeSlot.
        phonemeId: this.idsBySymbol.get(symbol) ?? null,
        isStressed: stressPending,
      });

      stressPending = false;
      cursor += symbol.length;
    }

    return new PhonemeSequence(slots);
  }

  /** Whether a bare symbol is one of the 44. Used to keep diagnoses honest. */
  knows(symbol: string): boolean {
    return this.idsBySymbol.has(symbol);
  }
}
