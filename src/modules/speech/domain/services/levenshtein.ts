/**
 * Edit distance between two sequences of tokens.
 *
 * Tokens rather than characters, because the same arithmetic serves both halves
 * of the blend `07-speech-scoring.md` specifies: the orthographic half compares
 * letters, the phoneme half compares IPA symbols, and `dʒ` is one symbol made
 * of two code points. Splitting a transcription by character would score it as
 * two wrong sounds instead of one.
 *
 * Two rows rather than a full matrix. The words are short, so this is not about
 * memory — it is that a full matrix invites a caller to read the traceback out
 * of it, and the traceback is not what this answers. Alignment is a separate
 * question with a separate service.
 */
export function editDistance(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  let previous: number[] = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current: number[] = [i];

    for (let j = 1; j <= right.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (left[i - 1] === right[j - 1] ? 0 : 1);
      const deletion = (previous[j] ?? 0) + 1;
      const insertion = (current[j - 1] ?? 0) + 1;

      current.push(Math.min(substitution, deletion, insertion));
    }

    previous = current;
  }

  return previous[right.length] ?? 0;
}

/**
 * Distance turned into a 0..1 similarity by the length of the longer side.
 *
 * Dividing by the **longer** side is what stops a one-letter transcript scoring
 * well against a long word: `s` against `station` is six edits over seven, so
 * 0.14. Dividing by the shorter side would give 1 − 6/1, a negative similarity
 * for an answer that was merely short.
 *
 * **Two empty sequences score 0, not 1.** They are identical, and identity is
 * not the question — the caller is asking how well a learner said a word, and
 * silence matched against nothing is no evidence of anything. `07` requires an
 * empty transcript to come back 0 with a "not heard" diagnosis rather than a
 * crash or, worse, full marks.
 */
export function normalisedSimilarity(left: readonly string[], right: readonly string[]): number {
  const longest = Math.max(left.length, right.length);

  if (longest === 0) {
    return 0;
  }

  return 1 - editDistance(left, right) / longest;
}

/**
 * Grapheme clusters, not code units and not code points.
 *
 * A transcript is whatever the browser's recogniser wrote down, and the app
 * sits beside Bangla content throughout. Splitting by code unit breaks a
 * conjunct or a vowel sign into pieces and reports two errors where a reader
 * sees one character, which would make the score depend on an encoding detail
 * nobody typed.
 */
const GRAPHEMES = new Intl.Segmenter('en', { granularity: 'grapheme' });

export function graphemes(value: string): readonly string[] {
  return [...GRAPHEMES.segment(value)].map((piece) => piece.segment);
}

/** The same, over the characters of two strings. */
export function textSimilarity(left: string, right: string): number {
  return normalisedSimilarity(graphemes(left), graphemes(right));
}
