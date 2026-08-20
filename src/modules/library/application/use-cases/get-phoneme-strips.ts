import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IMasteryRepository } from '@/modules/progress/domain/repositories/mastery-repository';
import { IpaSegmenter } from '../../domain/services/ipa-segmenter';
import { WordPhonemeResolver } from '../../domain/services/word-phoneme-resolver';
import { type IPhonemeRepository } from '../../domain/repositories/phoneme-repository';
import { type IWordPhonemeRepository } from '../../domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { type IPhonemeStripCell, type IWordPhonemeStrip } from '../dto/phoneme-strip';

export interface IGetPhonemeStripsInput {
  readonly userId: string;
  readonly wordIds: readonly string[];
}

/**
 * Words, their sounds, and how well **this learner** says each sound.
 *
 * This is what makes `PhonemeStrip` the component `12-design-system.md`
 * describes rather than a decorative transcription: the cells are tinted by the
 * learner's mastery, so two learners looking at the same word see different
 * strips.
 *
 * **Four reads, all batched, none per word.** Words by ids, phoneme links by
 * word ids, the 44-phoneme inventory once, and the learner's mastery rows once
 * — a lesson of twelve words costs four queries, not forty-nine. The join table
 * has existed since 002 for exactly this and, until F11.4, nothing on a screen
 * read it.
 *
 * A symbol the inventory does not know resolves to a `null` phoneme id and a
 * `null` accuracy: it is drawn as never-attempted rather than as a gap, which
 * is the truth — the scorer can compare it, mastery cannot credit it.
 */
export class GetPhonemeStripsUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly words: IWordRepository,
    private readonly wordPhonemes: IWordPhonemeRepository,
    private readonly phonemes: IPhonemeRepository,
    private readonly mastery: IMasteryRepository,
  ) {}

  async execute(input: IGetPhonemeStripsInput): Promise<readonly IWordPhonemeStrip[]> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    if (input.wordIds.length === 0) {
      return [];
    }

    const [words, links, inventory, records] = await Promise.all([
      this.words.findByIds(input.wordIds),
      this.wordPhonemes.findByWordIds(input.wordIds),
      this.phonemes.listAll(),
      this.mastery.findByProfile(profile.id),
    ]);

    const resolver = new WordPhonemeResolver(IpaSegmenter.fromPhonemes([...inventory]));

    const masteryByPhoneme = new Map(
      records
        .filter((record) => record.dimension === 'phoneme')
        .map((record) => [record.dimensionId, record] as const),
    );

    // Preserve the caller's order. `findByIds` gives no ordering guarantee, and
    // a lesson's words are in the order the content team taught them.
    const byId = new Map(words.map((word) => [word.id, word] as const));

    return input.wordIds.flatMap((wordId) => {
      const word = byId.get(wordId);

      if (word === undefined) {
        return [];
      }

      const sequence = resolver.resolve(word, links);

      const cells: readonly IPhonemeStripCell[] = sequence.slots.map((slot) => {
        const record = slot.phonemeId === null ? undefined : masteryByPhoneme.get(slot.phonemeId);

        return {
          symbol: slot.symbol,
          isStressed: slot.isStressed,
          phonemeId: slot.phonemeId,
          accuracy:
            record === undefined || record.attempts === 0
              ? null
              : record.correct / record.attempts,
          attempts: record?.attempts ?? 0,
        };
      });

      return [
        {
          wordId: word.id,
          text: word.text,
          ipa: word.ipa.value,
          syllables: word.syllables,
          banglaSound: word.banglaSound,
          cells,
        },
      ];
    });
  }
}
