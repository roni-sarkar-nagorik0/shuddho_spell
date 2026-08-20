import { type IPhonemeRepository } from '@/modules/library/domain/repositories/phoneme-repository';
import { IpaSegmenter } from '@/modules/library/domain/services/ipa-segmenter';
import { type ISpeechScorer } from '@/modules/shared/application/ports/speech-scorer';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import {
  type IPronunciationJudge,
  type IPronunciationTarget,
} from '../../domain/services/exam-answer-marker';

/**
 * The exam module's pronunciation judge, over Phase 6's scorer.
 *
 * The exams domain declares what it needs — a number out of 100 for a
 * transcript against a target — and never names `ISpeechScorer`. This is the
 * one file that knows the two are connected, which is what makes replacing the
 * scorer with an acoustic model a change to a constructor argument.
 *
 * The inventory is loaded **once per instance**, not once per question. A
 * 150-question paper with 30 pronunciation items would otherwise read the 44
 * phonemes thirty times inside one submission; the container builds one of
 * these per request, so the cache lives exactly as long as it should.
 */
export class SpeechScorerPronunciationJudge implements IPronunciationJudge {
  private segmenter: IpaSegmenter | null = null;

  constructor(
    private readonly phonemes: IPhonemeRepository,
    private readonly scorer: ISpeechScorer,
  ) {}

  async scorePercent(target: IPronunciationTarget, transcript: string): Promise<number> {
    const segmenter = await this.inventory();
    const expected = segmenter.segment(IpaTranscription.of(target.ipa));

    return this.scorer.score({
      expectedText: target.text,
      expected: { phonemes: expected.symbols(), stressIndex: expected.stressedPosition() },
      heardTranscript: transcript,
      // No observed pronunciation in an exam: the runtime posts a transcript,
      // and a stress error is not diagnosable from one. It is not scored here,
      // which is honest — better than a guess dressed as a measurement.
      heard: null,
    }).scorePercent;
  }

  private async inventory(): Promise<IpaSegmenter> {
    const cached = this.segmenter;

    if (cached !== null) {
      return cached;
    }

    const built = IpaSegmenter.fromPhonemes(await this.phonemes.listAll());

    this.segmenter = built;

    return built;
  }
}
