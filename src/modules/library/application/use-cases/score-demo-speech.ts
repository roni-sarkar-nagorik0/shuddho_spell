import { type ISpeechScorer } from '@/modules/shared/application/ports/speech-scorer';
import { usesWordOrForm } from '@/modules/shared/domain/text/inflections';
import { wordCount } from '@/modules/shared/domain/text/words-in';
import { MissingReferenceError } from '@/modules/shared/domain/errors/missing-reference.error';
import { NAMED_NEAR_MISS_CEILING } from '@/modules/speech/domain/services/pronunciation-blend';
import { focusTranscript } from '@/modules/speech/domain/services/transcript-focus';
import { type IPhonemeRepository } from '../../domain/repositories/phoneme-repository';
import { type IWordPhonemeRepository } from '../../domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { IpaSegmenter } from '../../domain/services/ipa-segmenter';
import { WordPhonemeResolver } from '../../domain/services/word-phoneme-resolver';
import {
  type DemoSpeechMode,
  type IDemoSentenceFindings,
  type IDemoSpeechScore,
} from '../dto/demo-speech-score';

/**
 * The fewest words that can be a sentence rather than a fragment.
 *
 * Three — a subject, a verb and something for the verb to act on. "I visit
 * school" clears it; "visit school" and "visit" do not. It is a **length**
 * check and it is described as one everywhere it surfaces: no claim is made
 * that three words is grammatical, only that fewer than three cannot be the
 * sentence the exercise asked for.
 */
const SENTENCE_MINIMUM_WORDS = 3;

export interface IScoreDemoSpeechInput {
  readonly wordId: string;
  /**
   * What the browser's recogniser wrote down. **Text, and only ever text.**
   * The shape of this input is where "the server receives no audio" is either
   * true or not.
   */
  readonly transcript: string;
  readonly mode: DemoSpeechMode;
}

/**
 * A spoken attempt, marked, for somebody who has not signed up.
 *
 * **It writes nothing.** The signed-in speak stage —
 * `SubmitPronunciationAttemptUseCase` — records an attempt, moves a review item
 * and writes the phoneme axis of the mastery matrix, all in one Postgres
 * function. An anonymous visitor has no profile to write against, no consent to
 * write under, and 021's `profile_id` is `not null`. So this reads three tables
 * and returns; there is no session to corrupt and nothing to roll back.
 *
 * **It is the same scorer, not a demo version of one.** The whole claim the
 * landing page is making is that the course marks pronunciation on the sounds
 * Bangla lacks, and a lookalike here would be advertising something the product
 * does not do. `ISpeechScorer` is the port the lesson uses;
 * `ConfusionMapSpeechScorer` is the adapter behind both.
 *
 * **Sentence mode is the same scoring with more around it.** The assessor
 * already locates the target word inside whatever the recogniser wrote —
 * `focusTranscript` exists because the Web Speech API hears the room — so a
 * sentence is simply a transcript with more in it. What the sentence step adds
 * is the two things a browser can honestly establish about it: that the word
 * was used, and that it was said inside something long enough to be a sentence.
 * It adds no grammar verdict, because there is no target to mark against and
 * inventing one is not available.
 */
export class ScoreDemoSpeechUseCase {
  constructor(
    private readonly words: IWordRepository,
    private readonly wordPhonemes: IWordPhonemeRepository,
    private readonly phonemes: IPhonemeRepository,
    private readonly scorer: ISpeechScorer,
  ) {}

  async execute(input: IScoreDemoSpeechInput): Promise<IDemoSpeechScore> {
    const word = await this.words.findById(input.wordId);

    if (word === null) {
      throw new MissingReferenceError('Word', input.wordId);
    }

    // A typed sentence is checked, not pronounced. It returns before the two
    // phoneme reads as well as before the scorer: there is nothing for either
    // of them to do, and doing them anyway would be paying for a number this
    // must not report.
    if (input.mode === 'sentence-written') {
      return {
        mode: input.mode,
        scorePercent: null,
        transcript: input.transcript,
        heard: '',
        isNotHeard: input.transcript.trim() === '',
        isClean: false,
        diagnoses: [],
        sentence: this.findings(input.transcript, word.text),
      };
    }

    // The stored G2P: the transcription decides the sounds and their stress,
    // the join table decides which phoneme row each one is. The same two reads
    // the lesson's speak stage makes, for the same reason.
    const [links, inventory] = await Promise.all([
      this.wordPhonemes.findByWordIds([word.id]),
      this.phonemes.listAll(),
    ]);

    const expected = new WordPhonemeResolver(IpaSegmenter.fromPhonemes(inventory)).resolve(
      word,
      links,
    );

    const score = this.scorer.score({
      expected: { phonemes: expected.symbols(), stressIndex: expected.stressedPosition() },
      heardTranscript: input.transcript,
      expectedText: word.text,
      // The Web Speech API returns words, not sounds. Stress is the one error a
      // transcript cannot carry, and it is left undiagnosed rather than guessed
      // from spelling.
      heard: null,
    });

    // The same token the assessor scored, located the same way. The recogniser
    // hears the room — "so anyway water right" — and showing the visitor the
    // whole string as "what we heard" would misreport what was marked.
    const focus = focusTranscript(input.transcript, word.text);

    return {
      mode: input.mode,
      scorePercent: score.scorePercent,
      transcript: input.transcript,
      heard: focus.token,
      isNotHeard: focus.isEmpty,
      // Above the near-miss ceiling there is no named error left, which is what
      // the ceiling means — the same test the lesson's speak stage applies, so
      // the demo cannot be kinder than the course it is advertising.
      isClean: score.diagnoses.length === 0 && score.scorePercent > NAMED_NEAR_MISS_CEILING,
      diagnoses: score.diagnoses.map((diagnosis) => ({
        expected: diagnosis.expected,
        heard: diagnosis.heard,
        articulationFix: diagnosis.articulationFix,
      })),
      sentence: input.mode === 'word' ? null : this.findings(input.transcript, word.text),
    };
  }

  private findings(transcript: string, text: string): IDemoSentenceFindings {
    const words = wordCount(transcript);

    return {
      usesTheWord: usesWordOrForm(transcript, text),
      wordCount: words,
      isSentenceLength: words >= SENTENCE_MINIMUM_WORDS,
    };
  }
}
