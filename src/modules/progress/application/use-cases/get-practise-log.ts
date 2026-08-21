import { ProfileNotFoundError } from '@/modules/auth/domain/errors/profile-not-found.error';
import { type ILearnerProfileRepository } from '@/modules/auth/domain/repositories/learner-profile-repository';
import {
  type IPractisedWordPage,
  type IPractiseLogRepository,
  type PractiseSource,
} from '../../domain/repositories/practise-log-repository';
import { type IPractiseLog } from '../dto/practise-log';

export interface IGetPractiseLogInput {
  readonly userId: string;
  readonly source: PractiseSource;
  /** 1-based, as it appears in the URL. Clamped rather than trusted. */
  readonly page: number;
}

/**
 * A page of words this learner has practised, ever.
 *
 * Not "today" — that is the dashboard's panel, and this is the screen it links
 * to. The whole history, one row per word, newest first.
 */
export const PRACTISE_LOG_PAGE_SIZE = 25;

export class GetPractiseLogUseCase {
  constructor(
    private readonly profiles: ILearnerProfileRepository,
    private readonly log: IPractiseLogRepository,
  ) {}

  async execute(input: IGetPractiseLogInput): Promise<IPractiseLog> {
    const profile = await this.profiles.findByUserId(input.userId);

    if (profile === null) {
      throw new ProfileNotFoundError(input.userId);
    }

    // A page number arrives from a query string, so it is 0, -3, 1e9 or "two"
    // as readily as 2. Floor and clamp before it becomes an offset.
    const requested = Math.max(1, Math.floor(input.page));

    const first = await this.log.page(
      profile.id,
      input.source,
      PRACTISE_LOG_PAGE_SIZE,
      (requested - 1) * PRACTISE_LOG_PAGE_SIZE,
    );

    // A page past the end comes back empty, and an empty page carries no total
    // — so "page 900 of a 3-page log" would report zero words in total, which
    // reads as "you have never practised anything". Asking again for the last
    // real page is one extra round trip in a case a learner reaches by editing
    // the URL, and it is the difference between a wrong answer and a right one.
    if (first.words.length === 0 && requested > 1) {
      const last = await this.log.page(profile.id, input.source, PRACTISE_LOG_PAGE_SIZE, 0);

      return this.toLog(last, input.source, 1);
    }

    return this.toLog(first, input.source, requested);
  }

  private toLog(
    page: IPractisedWordPage,
    source: PractiseSource,
    pageNumber: number,
  ): IPractiseLog {
    return {
      words: page.words.map((word) => ({
        wordId: word.wordId,
        text: word.text,
        ipa: word.ipa,
        banglaSound: word.banglaSound,
        tries: word.tries,
        settled: word.settled,
        lastAt: word.lastAt.toISOString(),
      })),
      source,
      page: pageNumber,
      pageCount: Math.max(1, Math.ceil(page.totalWords / PRACTISE_LOG_PAGE_SIZE)),
      pageSize: PRACTISE_LOG_PAGE_SIZE,
      totalWords: page.totalWords,
    };
  }
}
