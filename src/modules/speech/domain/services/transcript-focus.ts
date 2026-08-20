import { normaliseAnswer } from '@/modules/shared/domain/text/normalise-answer';
import { textSimilarity } from './levenshtein';

export interface ITranscriptFocus {
  /** The word in the transcript that is the learner's attempt at the target. */
  readonly token: string;
  /** Words either side of it that the recogniser picked up. */
  readonly extraWords: number;
  readonly isEmpty: boolean;
}

/**
 * Finds the target word inside whatever the recogniser wrote down.
 *
 * `07-speech-scoring.md` requires this explicitly: the Web Speech API hears the
 * room, so a learner saying "water" while somebody nearby is talking produces
 * "so anyway water right" — and scoring the whole string against `water` would
 * tank an attempt that was correct. The extras do not tank the score; they are
 * counted and reported, and only the closest token is scored.
 *
 * Closest by similarity rather than by position, because the target is as
 * likely to be at the end as the start, and rather than by exact match, because
 * the whole premise is that the learner may have said it wrong — an attempt
 * scored 0 for not being a perfect match would defeat the scorer entirely.
 */
export function focusTranscript(transcript: string, expectedText: string): ITranscriptFocus {
  const normalised = normaliseAnswer(transcript);

  if (normalised.length === 0) {
    return { token: '', extraWords: 0, isEmpty: true };
  }

  const target = normaliseAnswer(expectedText);
  const tokens = normalised.split(' ');

  let best = tokens[0] ?? '';
  let bestSimilarity = -1;

  for (const token of tokens) {
    const similarity = textSimilarity(token, target);

    if (similarity > bestSimilarity) {
      best = token;
      bestSimilarity = similarity;
    }
  }

  return { token: best, extraWords: tokens.length - 1, isEmpty: false };
}
