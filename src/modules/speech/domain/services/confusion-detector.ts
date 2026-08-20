import { PhonemeSequence, type IPhonemeSlot } from '@/modules/library/domain/value-objects/phoneme-sequence';
import { type BengaliConfusionMap } from '../data/bengali-confusion-map';
import { type IPhonemeConfusion } from '../value-objects/phoneme-confusion';
import { editDistance, graphemes, textSimilarity } from './levenshtein';

/**
 * The IPA vowel letters, by first character.
 *
 * A dropped final cluster has to be judged on **sounds, not spelling**: `asked`
 * ends in the letters `e` and `d` and in the sounds /k/ and /t/, and only the
 * second pair is a cluster anybody can drop. Reading the spelling here was a
 * real bug — it made the commonest example of this confusion undetectable.
 */
const VOWEL_SYMBOL_STARTS = new Set([
  'a', 'e', 'i', 'o', 'u', 'æ', 'ɑ', 'ɒ', 'ɔ', 'ə', 'ɜ', 'ɪ', 'ʊ', 'ʌ', 'ɛ', 'ɐ', 'ø', 'y',
]);

function isVowelSymbol(symbol: string): boolean {
  return VOWEL_SYMBOL_STARTS.has(symbol.charAt(0));
}

/** What a Bengali speaker inserts in front of a word-initial /s/ cluster. */
const EPENTHETIC_VOWEL = 'ɪ';

export interface IConfusionDetection {
  /** The confusions that best explain the transcript. Usually one; often none. */
  readonly confusions: readonly IPhonemeConfusion[];
  /** What the learner is taken to have said. */
  readonly heard: PhonemeSequence;
  /**
   * True when `heard` was **deduced** from the confusions rather than observed.
   * The caller needs the difference: a deduced sequence agrees with the
   * expected one everywhere the confusions do not reach, so it must never be
   * read as evidence that those sounds were correct.
   */
  readonly isHypothesis: boolean;
  /**
   * How far the best explanation still falls short of the transcript, in edits.
   *
   * Zero means the map predicted the transcript exactly. It is what separates
   * "said `very` with a /w/" from "said a different word that happens to start
   * with one", and the clamp in the blend turns on it — without it, a wholly
   * wrong answer that any row improves *slightly* would be floored at 65.
   */
  readonly residualEdits: number;
}

export interface IConfusionDetectionInput {
  readonly expectedText: string;
  /** The one token from the transcript that is the attempt — see `focusTranscript`. */
  readonly heardToken: string;
  readonly expected: PhonemeSequence;
  /** The observed pronunciation, when anything could produce one. Usually null. */
  readonly observed: PhonemeSequence | null;
}

/**
 * Which known error, if any, explains the difference between the word and the
 * transcript.
 *
 * This is where the privacy constraint of `07-speech-scoring.md` gets paid for.
 * The server holds text, never audio, so it cannot *hear* that /v/ came out as
 * /w/ — it can only notice that `very` came back as `wery`, that the confusion
 * map predicts exactly that deformation, and that no other entry predicts it
 * better. The detector is therefore a hypothesis test over the table rather
 * than an acoustic measurement, and it says so: `isHypothesis`.
 *
 * Only the **best** explanations are kept. `this` heard as `dis` is improved by
 * both the /ð/→/d/ row and, slightly, by the /θ/→/t/ row; reporting both would
 * hand the learner a fix for a sound they never said. The strongest candidate
 * wins and ties are kept together.
 */
export class ConfusionDetector {
  constructor(private readonly map: BengaliConfusionMap) {}

  detect(input: IConfusionDetectionInput): IConfusionDetection {
    const baseline = textSimilarity(input.expectedText, input.heardToken);

    const scored = this.map
      .all()
      .flatMap((confusion) => {
        const best = this.bestCandidate(
          confusion,
          input.expectedText,
          input.heardToken,
          input.expected,
        );

        return best === null || best.similarity <= baseline ? [] : [{ confusion, best }];
      })
      .sort((left, right) => right.best.similarity - left.best.similarity);

    const strongest = scored[0]?.best.similarity ?? 0;
    const winners = scored
      .filter((entry) => entry.best.similarity === strongest)
      .filter((entry) => explainsTranscript(entry.best.candidate, input.heardToken));
    const confusions = winners.map((entry) => entry.confusion);

    const stress = this.detectStress(input);
    const all = stress === null ? confusions : [...confusions, stress];

    // With no substitution to measure against, the residual is simply how far
    // the transcript sits from the word — zero for a stress error, which is the
    // only confusion that leaves the spelling alone.
    const residualEdits =
      winners.length === 0
        ? editDistance(graphemes(input.expectedText), graphemes(input.heardToken))
        : Math.min(
            ...winners.map((entry) =>
              editDistance(graphemes(entry.best.candidate), graphemes(input.heardToken)),
            ),
          );

    if (input.observed !== null) {
      return { confusions: all, heard: input.observed, isHypothesis: false, residualEdits };
    }

    return {
      confusions: all,
      heard: this.deduce(input.expected, all),
      isHypothesis: true,
      residualEdits,
    };
  }

  /**
   * How close this confusion can get to what was heard, or null when it does
   * not apply to this word at all.
   */
  private bestCandidate(
    confusion: IPhonemeConfusion,
    expectedText: string,
    heardToken: string,
    expected: PhonemeSequence,
  ): { readonly candidate: string; readonly similarity: number } | null {
    const candidates =
      confusion.kind === 'cluster-drop'
        ? droppedClusterCandidates(expectedText, expected)
        : confusion.graphemeShifts.flatMap((shift) =>
            expectedText.includes(shift.from)
              ? [
                  expectedText.replace(shift.from, shift.to),
                  expectedText.replaceAll(shift.from, shift.to),
                ]
              : [],
          );

    let best: { candidate: string; similarity: number } | null = null;

    for (const candidate of candidates) {
      const similarity = textSimilarity(candidate, heardToken);

      if (best === null || similarity > best.similarity) {
        best = { candidate, similarity };
      }
    }

    return best;
  }

  /**
   * Stress is the one confusion a transcript cannot carry: `hotel` said with
   * the emphasis on the first syllable is still written `hotel`. It is
   * detectable only against an observed pronunciation — which is why the port
   * accepts one — and it is never guessed from text.
   */
  private detectStress(input: IConfusionDetectionInput): IPhonemeConfusion | null {
    const observed = input.observed;

    if (observed === null) {
      return null;
    }

    const sameSounds =
      observed.symbols().length === input.expected.symbols().length &&
      observed.symbols().every((symbol, index) => symbol === input.expected.symbols()[index]);

    const expectedStress = input.expected.stressedPosition();
    const heardStress = observed.stressedPosition();

    if (!sameSounds || expectedStress === null || heardStress === null) {
      return null;
    }

    return expectedStress === heardStress ? null : this.map.byId('first-syllable-stress');
  }

  /** The pronunciation the detected confusions predict, applied to the word. */
  private deduce(
    expected: PhonemeSequence,
    confusions: readonly IPhonemeConfusion[],
  ): PhonemeSequence {
    let slots: readonly IPhonemeSlot[] = expected.slots;

    for (const confusion of confusions) {
      switch (confusion.kind) {
        case 'substitution':
          slots = slots.map((slot) =>
            slot.symbol === confusion.expected
              ? { ...slot, symbol: confusion.commonlyHeardAs[0] ?? slot.symbol }
              : slot,
          );
          break;
        case 'epenthesis':
          slots = [
            { position: 0, symbol: EPENTHETIC_VOWEL, phonemeId: null, isStressed: false },
            ...slots,
          ];
          break;
        case 'cluster-drop':
          slots = slots.slice(0, -1);
          break;
        case 'stress':
          slots = slots.map((slot, index) => ({ ...slot, isStressed: index === 0 }));
          break;
      }
    }

    return new PhonemeSequence(slots.map((slot, index) => ({ ...slot, position: index })));
  }
}

/**
 * Whether the prediction is close enough to what was heard to be believed.
 *
 * Without this the map improves *something* about almost any wrong answer:
 * `very` heard as `wall` is nudged closer by the /v/→/w/ row, and left
 * unchecked that becomes a confident, wrong, and rather insulting diagnosis
 * — the learner is told to move their lip when they said a different word
 * entirely. `07-speech-scoring.md` asks for the opposite: an unrelated word
 * scores low **and says nothing**.
 *
 * The tolerance grows with the word because a recogniser spelling a nonword is
 * approximating: one edit in four letters is noise, three is a different word.
 */
function explainsTranscript(candidate: string, heardToken: string): boolean {
  const tolerance = Math.max(1, Math.round(candidate.length / 4));

  return editDistance(graphemes(candidate), graphemes(heardToken)) <= tolerance;
}

/**
 * `asked` said as `ask`, `texts` as `tex`. Only a word whose last two *sounds*
 * are both consonants can lose one, which is what keeps this from firing on
 * every short answer.
 */
function droppedClusterCandidates(
  expectedText: string,
  expected: PhonemeSequence,
): readonly string[] {
  const symbols = expected.symbols();
  const last = symbols[symbols.length - 1];
  const penultimate = symbols[symbols.length - 2];

  const endsInCluster =
    last !== undefined &&
    penultimate !== undefined &&
    !isVowelSymbol(last) &&
    !isVowelSymbol(penultimate);

  if (!endsInCluster || expectedText.length < 3) {
    return [];
  }

  return [expectedText.slice(0, -1), expectedText.slice(0, -2)];
}
