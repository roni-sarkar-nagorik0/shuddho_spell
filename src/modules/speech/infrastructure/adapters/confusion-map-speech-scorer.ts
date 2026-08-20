import { PhonemeSequence } from '@/modules/library/domain/value-objects/phoneme-sequence';
import {
  type IPhonemeScore,
  type IPronunciationDiagnosis,
  type IPronunciationScore,
  type IPronunciationScoreInput,
  type ISpeechScorer,
  type ISpokenForm,
} from '@/modules/shared/application/ports/speech-scorer';
import { BengaliConfusionMap } from '../../domain/data/bengali-confusion-map';
import { ConfusionDetector } from '../../domain/services/confusion-detector';
import { PhonemeComparer } from '../../domain/services/phoneme-comparer';
import {
  PronunciationAssessor,
  type IPronunciationAssessment,
} from '../../domain/services/pronunciation-assessor';

/**
 * The diagnosis for silence.
 *
 * `07-speech-scoring.md` requires an empty transcript to come back 0 **with a
 * "not heard" diagnosis, never a crash**, and the wording of the fix matters as
 * much as its existence: nothing was recorded, which is usually a microphone or
 * a browser, and telling a learner their pronunciation was wrong when the
 * device never heard them is both untrue and discouraging.
 */
function notHeard(expectedText: string): IPronunciationDiagnosis {
  return {
    expected: expectedText,
    // Empty, and truthfully so: nothing was heard. Putting anything else here
    // would be inventing an attempt the learner never made.
    heard: '',
    articulationFix:
      'Nothing was heard. Check that the microphone is allowed and working, then say the word again — this attempt says nothing about your pronunciation.',
  };
}

/**
 * `ISpeechScorer` over the Bengali confusion map.
 *
 * An adapter rather than a domain service, and the distinction is the point of
 * the port: every judgement here is made by pure services in
 * `speech/domain/`, and this file only translates between their vocabulary and
 * the application's. When a real acoustic model arrives it replaces this class
 * and nothing else — no use case changes, because none of them ever knew how a
 * score was arrived at.
 */
export class ConfusionMapSpeechScorer implements ISpeechScorer {
  private readonly assessor: PronunciationAssessor;

  constructor(private readonly map: BengaliConfusionMap = new BengaliConfusionMap()) {
    this.assessor = new PronunciationAssessor(
      map,
      new ConfusionDetector(map),
      new PhonemeComparer(map),
    );
  }

  score(input: IPronunciationScoreInput): IPronunciationScore {
    const assessment = this.assessor.assess({
      expectedText: input.expectedText,
      expected: toSequence(input.expected),
      heardTranscript: input.heardTranscript,
      observed: input.heard === null ? null : toSequence(input.heard),
    });

    return {
      scorePercent: assessment.scorePercent,
      perPhoneme: assessment.credits.map(
        (credit): IPhonemeScore => ({
          expected: credit.expected,
          heard: credit.heard,
          credit: credit.credit,
        }),
      ),
      diagnoses: this.diagnose(assessment, input),
    };
  }

  /**
   * One diagnosis per distinct error, never one per damaged sound.
   *
   * A learner who says `wery` has made **one** mistake, and a word containing
   * two /v/ sounds would otherwise be told the same thing twice — which reads
   * as two problems and is one.
   */
  private diagnose(
    assessment: IPronunciationAssessment,
    input: IPronunciationScoreInput,
  ): readonly IPronunciationDiagnosis[] {
    if (assessment.isNotHeard) {
      return [notHeard(input.expectedText)];
    }

    const seen = new Set<string>();
    const diagnoses: IPronunciationDiagnosis[] = [];

    for (const credit of assessment.credits) {
      const id = credit.confusionId;
      const confusion = id === null ? null : this.map.byId(id);

      if (id === null || confusion === null || seen.has(id)) {
        continue;
      }

      seen.add(id);
      diagnoses.push({
        expected: credit.expected,
        heard: credit.heard,
        articulationFix: confusion.articulationFix,
      });
    }

    // Stress damages no single sound, so it never appears above — every cell of
    // `perPhoneme` can be full marks while the word is still wrong.
    const stress = assessment.confusions.find((confusion) => confusion.kind === 'stress');

    if (stress !== undefined && !seen.has(stress.id)) {
      diagnoses.push({
        expected: stressedSound(input.expected),
        heard: input.heard === null ? '' : stressedSound(input.heard),
        articulationFix: stress.articulationFix,
      });
    }

    return diagnoses;
  }
}

function toSequence(form: ISpokenForm): PhonemeSequence {
  return new PhonemeSequence(
    form.phonemes.map((symbol, index) => ({
      position: index,
      symbol,
      // Ids belong to mastery, and the scorer writes none — see IPhonemeSlot.
      phonemeId: null,
      isStressed: index === form.stressIndex,
    })),
  );
}

/** The sound the emphasis landed on, which is what a stress diagnosis names. */
function stressedSound(form: ISpokenForm): string {
  return form.stressIndex === null ? '' : (form.phonemes[form.stressIndex] ?? '');
}
