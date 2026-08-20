import { PhonemeSequence, type IPhonemeSlot } from '@/modules/library/domain/value-objects/phoneme-sequence';
import { type BengaliConfusionMap } from '../data/bengali-confusion-map';
import { type IPhonemeConfusion } from '../value-objects/phoneme-confusion';
import { textSimilarity } from './levenshtein';

/** English vowel letters. Used only to tell a final cluster from a final vowel. */
const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

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
        const best = this.bestCandidate(confusion, input.expectedText, input.heardToken);

        return best === null || best <= baseline ? [] : [{ confusion, strength: best }];
      })
      .sort((left, right) => right.strength - left.strength);

    const strongest = scored[0]?.strength ?? 0;
    const confusions = scored
      .filter((entry) => entry.strength === strongest)
      .map((entry) => entry.confusion);

    const stress = this.detectStress(input);
    const all = stress === null ? confusions : [...confusions, stress];

    if (input.observed !== null) {
      return { confusions: all, heard: input.observed, isHypothesis: false };
    }

    return { confusions: all, heard: this.deduce(input.expected, all), isHypothesis: true };
  }

  /**
   * How close this confusion can get to what was heard, or null when it does
   * not apply to this word at all.
   */
  private bestCandidate(
    confusion: IPhonemeConfusion,
    expectedText: string,
    heardToken: string,
  ): number | null {
    const candidates =
      confusion.kind === 'cluster-drop'
        ? droppedClusterCandidates(expectedText)
        : confusion.graphemeShifts.flatMap((shift) =>
            expectedText.includes(shift.from)
              ? [
                  expectedText.replace(shift.from, shift.to),
                  expectedText.replaceAll(shift.from, shift.to),
                ]
              : [],
          );

    if (candidates.length === 0) {
      return null;
    }

    return Math.max(...candidates.map((candidate) => textSimilarity(candidate, heardToken)));
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
 * `asked` said as `ask`, `texts` as `tex`. Only a word ending in two consonants
 * can lose one, which is what keeps this from firing on every short answer.
 */
function droppedClusterCandidates(expectedText: string): readonly string[] {
  const last = expectedText.slice(-1);
  const penultimate = expectedText.slice(-2, -1);

  if (VOWEL_LETTERS.has(last) || VOWEL_LETTERS.has(penultimate) || expectedText.length < 3) {
    return [];
  }

  return [expectedText.slice(0, -1), expectedText.slice(0, -2)];
}
