import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import { type IRuleFamilyRepository } from '@/modules/library/domain/repositories/rule-family-repository';
import { type ISentenceItemRepository } from '@/modules/library/domain/repositories/sentence-item-repository';
import { type IWordRepository } from '@/modules/library/domain/repositories/word-repository';
import { DayIndex } from '@/modules/shared/domain/value-objects/day-index';
import { DayLockedError } from '../../domain/errors/day-locked.error';
import { DayNotFoundError } from '../../domain/errors/day-not-found.error';
import { type IProgramRepository } from '../../domain/repositories/program-repository';
import { type IProgramDayDetail } from '../dto/program-day-detail';

export interface IGetProgramDayInput {
  readonly userId: string;
  readonly dayIndex: number;
}

/**
 * One day of the programme with its content resolved.
 *
 * The three content reads run together rather than in sequence: they do not
 * depend on each other, and a day with 12 words, 5 sentences and 2 rules should
 * cost three queries, not seventeen. `findByIds` on every content port exists
 * for exactly this.
 */
export class GetProgramDayUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly program: IProgramRepository,
    private readonly words: IWordRepository,
    private readonly sentences: ISentenceItemRepository,
    private readonly rules: IRuleFamilyRepository,
  ) {}

  async execute(input: IGetProgramDayInput): Promise<IProgramDayDetail> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    const dayIndex = DayIndex.of(input.dayIndex);

    // Checked before the content is read, not after. A locked day should cost
    // one query and a refusal, and a learner probing urls should not be able to
    // make the server assemble a day it is about to withhold.
    if (dayIndex.value > profile.currentDayIndex.value) {
      throw new DayLockedError(dayIndex.value, profile.currentDayIndex.value);
    }

    const day = await this.program.findDay(profile.track, dayIndex);

    if (day === null) {
      throw new DayNotFoundError(profile.track, dayIndex.value);
    }

    const [words, sentences, rules] = await Promise.all([
      this.words.findByIds(day.wordIds()),
      this.sentences.findByIds(day.sentenceItemIds()),
      this.rules.findByIds(day.ruleFamilyIds()),
    ]);

    return {
      dayIndex: day.dayIndex.value,
      weekIndex: day.weekIndex,
      title: day.title,
      description: day.description,
      estimatedMinutes: day.estimatedMinutes,
      words: words.map((word) => ({
        id: word.id,
        text: word.text,
        ipa: word.ipa.value,
        syllables: word.syllables,
        banglaSound: word.banglaSound,
        banglaMeaning: word.banglaMeaning,
        partOfSpeech: word.partOfSpeech,
      })),
      sentences: sentences.map((sentence) => ({
        id: sentence.id,
        banglaText: sentence.banglaText,
        englishText: sentence.englishText,
        distractorWords: sentence.distractorWords,
        difficulty: sentence.difficulty,
      })),
      rules: rules.map((rule) => ({
        id: rule.id,
        code: rule.code,
        statement: rule.statement,
        examples: rule.examples,
        counterexamples: rule.counterexamples,
      })),
    };
  }
}
