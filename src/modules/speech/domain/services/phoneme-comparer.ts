import { type PhonemeSequence } from '@/modules/library/domain/value-objects/phoneme-sequence';
import { type BengaliConfusionMap } from '../data/bengali-confusion-map';
import { align } from './alignment';
import { type IConfusionDetection } from './confusion-detector';

/** One expected sound, and what it earned. */
export interface IPhonemeCredit {
  readonly expected: string;
  /** Empty when the sound was left out altogether. */
  readonly heard: string;
  /** 0..1. */
  readonly credit: number;
  /** The confusion that explains the loss, when one does. */
  readonly confusionId: string | null;
}

export interface IPhonemeComparison {
  readonly credits: readonly IPhonemeCredit[];
  /** 0..1, the mean credit — extra sounds nobody asked for included. */
  readonly score: number;
}

/**
 * Marks the word sound by sound.
 *
 * The rule `07-speech-scoring.md` exists to enforce lives here: **a known
 * confusion is never worth zero.** A learner who put /w/ where /v/ belonged
 * produced a sound that is one lip position away from correct and has a
 * specific remedy; a learner who produced /k/ there did something else
 * entirely. Marking both zero says the two are the same mistake, which is
 * false, and it is the reason a scorer teaches nothing.
 *
 * A stress error is applied to the **whole word** rather than to one slot, and
 * that is deliberate: English lexical stress is a property of the word — it is
 * what separates a REcord from reCORD — so every sound being right does not
 * make the word right. The per-phoneme array stays honest at the same time,
 * because stress is not a phoneme and does not belong in any of its cells.
 */
export class PhonemeComparer {
  constructor(private readonly map: BengaliConfusionMap) {}

  compare(expected: PhonemeSequence, detection: IConfusionDetection): IPhonemeComparison {
    const clusterDrop = detection.confusions.find((entry) => entry.kind === 'cluster-drop') ?? null;
    const epenthesis = detection.confusions.find((entry) => entry.kind === 'epenthesis') ?? null;
    const stress = detection.confusions.find((entry) => entry.kind === 'stress') ?? null;

    const steps = align(expected.symbols(), detection.heard.symbols(), (left, right) =>
      1 - (this.map.creditFor(left, right) ?? 0),
    );

    const credits: IPhonemeCredit[] = [];
    let unexplainedExtras = 0;

    for (const step of steps) {
      if (step.expected === null) {
        // A sound the learner added. Explained only when an epenthetic vowel
        // was detected — that one is already charged for below.
        if (epenthesis === null) {
          unexplainedExtras += 1;
        }
        continue;
      }

      if (step.heard === null) {
        credits.push(
          clusterDrop === null
            ? { expected: step.expected, heard: '', credit: 0, confusionId: null }
            : {
                expected: step.expected,
                heard: '',
                credit: clusterDrop.partialCredit,
                confusionId: clusterDrop.id,
              },
        );
        continue;
      }

      if (step.expected === step.heard) {
        credits.push({ expected: step.expected, heard: step.heard, credit: 1, confusionId: null });
        continue;
      }

      const confusion = this.map.explain(step.expected, step.heard);

      credits.push({
        expected: step.expected,
        heard: step.heard,
        credit: confusion?.partialCredit ?? 0,
        confusionId: confusion?.id ?? null,
      });
    }

    const charged =
      epenthesis === null ? credits : chargeEpenthesis(credits, epenthesis.expected, epenthesis);

    const denominator = charged.length + unexplainedExtras;
    const total = charged.reduce((sum, credit) => sum + credit.credit, 0);
    const mean = denominator === 0 ? 0 : total / denominator;

    return { credits: charged, score: stress === null ? mean : mean * stress.partialCredit };
  }
}

/**
 * The inserted vowel is charged to the consonant it was inserted in front of.
 *
 * Charging the insertion itself would be tidier and wrong: the learner did not
 * add a sound the word lacks so much as fail to start on the /s/, and the fix
 * they need to read is about the /s/.
 */
function chargeEpenthesis(
  credits: readonly IPhonemeCredit[],
  symbol: string,
  confusion: { readonly id: string; readonly partialCredit: number },
): readonly IPhonemeCredit[] {
  const index = credits.findIndex((credit) => credit.expected === symbol);

  return credits.map((credit, position) =>
    position === index
      ? {
          ...credit,
          credit: Math.min(credit.credit, confusion.partialCredit),
          confusionId: confusion.id,
        }
      : credit,
  );
}
