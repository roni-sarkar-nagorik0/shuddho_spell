import { type PhonemeSequence } from '@/modules/library/domain/value-objects/phoneme-sequence';
import { normaliseAnswer } from '@/modules/shared/domain/text/normalise-answer';
import { type BengaliConfusionMap } from '../data/bengali-confusion-map';
import { acceptableRenderings } from '../data/homophone-groups';
import { type IPhonemeConfusion } from '../value-objects/phoneme-confusion';
import { type ConfusionDetector } from './confusion-detector';
import { textSimilarity } from './levenshtein';
import { type IPhonemeCredit, type PhonemeComparer } from './phoneme-comparer';
import { blendPronunciationScore } from './pronunciation-blend';
import { focusTranscript } from './transcript-focus';

export interface IAssessmentInput {
  readonly expectedText: string;
  /** The stored G2P for the word — F6.1's resolved sequence. */
  readonly expected: PhonemeSequence;
  /** Exactly what the browser's recogniser wrote down. */
  readonly heardTranscript: string;
  /**
   * An observed pronunciation, when anything could produce one. Null is the
   * normal case and the scorer works without it; a stress error is the one
   * thing that cannot be seen without it.
   */
  readonly observed: PhonemeSequence | null;
}

export interface IPronunciationAssessment {
  /** 0..100. */
  readonly scorePercent: number;
  readonly credits: readonly IPhonemeCredit[];
  readonly confusions: readonly IPhonemeConfusion[];
  /** The token from the transcript that was actually scored. */
  readonly heardToken: string;
  /** The acceptable spelling it was measured against — see homophones. */
  readonly matchedRendering: string;
  readonly isHomophone: boolean;
  readonly extraWords: number;
  /** Nothing was said, or nothing was heard. Scored 0, never crashed. */
  readonly isNotHeard: boolean;
}

/**
 * The whole assessment, assembled — everything but the shape the port returns.
 *
 * The order matters and each step earns its place. The target word is located
 * inside the transcript first, because the recogniser hears the room. The
 * closest **acceptable spelling** is chosen next, so a learner who said `there`
 * correctly is not marked down because the recogniser wrote `their`. Only then
 * is the difference explained against the confusion map, and only then scored.
 *
 * The one judgement call worth naming: when no confusion explains the
 * difference and there is no observed pronunciation, the phoneme half has **no
 * evidence of its own**, so it takes the orthographic similarity rather than
 * the deduced sequence's score. The deduced sequence equals the expected one in
 * that case, and scoring it would hand a wholly wrong word full marks on half
 * the mark — the exact failure `07-speech-scoring.md` asks the unrelated-word
 * case to catch.
 */
export class PronunciationAssessor {
  constructor(
    private readonly map: BengaliConfusionMap,
    private readonly detector: ConfusionDetector,
    private readonly comparer: PhonemeComparer,
  ) {}

  assess(input: IAssessmentInput): IPronunciationAssessment {
    const target = normaliseAnswer(input.expectedText);
    const focus = focusTranscript(input.heardTranscript, target);

    if (focus.isEmpty) {
      return {
        scorePercent: 0,
        credits: [],
        confusions: [],
        heardToken: '',
        matchedRendering: target,
        isHomophone: false,
        extraWords: 0,
        isNotHeard: true,
      };
    }

    const rendering = closestRendering(target, focus.token);
    const detection = this.detector.detect({
      expectedText: rendering.text,
      heardToken: focus.token,
      expected: input.expected,
      observed: input.observed,
    });

    const comparison = this.comparer.compare(input.expected, detection);
    const hasEvidence = !detection.isHypothesis || detection.confusions.length > 0;
    const phonemeScore = hasEvidence ? comparison.score : rendering.similarity;

    const damaged = comparison.credits.filter((credit) => credit.credit < 1).length;

    const scorePercent = blendPronunciationScore({
      orthographicSimilarity: rendering.similarity,
      phonemeScore,
      hasNamedConfusion: detection.confusions.length > 0,
      // "A single-phoneme miss on a *known* confusion", to the letter: one
      // damaged sound, and a prediction that matched the transcript to within
      // one edit. A wrong word that some row improves by a letter fails both.
      isSingleNamedMiss:
        detection.confusions.length > 0 && detection.residualEdits <= 1 && damaged <= 1,
    });

    return {
      scorePercent,
      credits: comparison.credits,
      confusions: detection.confusions,
      heardToken: focus.token,
      matchedRendering: rendering.text,
      isHomophone: rendering.text !== target,
      extraWords: focus.extraWords,
      isNotHeard: false,
    };
  }

  /** Exposed so a caller can turn a credit back into the advice behind it. */
  confusionById(id: string): IPhonemeConfusion | null {
    return this.map.byId(id);
  }
}

function closestRendering(
  target: string,
  heardToken: string,
): { readonly text: string; readonly similarity: number } {
  let best = { text: target, similarity: textSimilarity(target, heardToken) };

  for (const rendering of acceptableRenderings(target)) {
    const similarity = textSimilarity(rendering, heardToken);

    if (similarity > best.similarity) {
      best = { text: rendering, similarity };
    }
  }

  return best;
}
