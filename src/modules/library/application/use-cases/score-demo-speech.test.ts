/**
 * The spoken half of the demo, and the four claims on it that would each ship
 * green while being wrong.
 *
 * - **It is the real scorer.** The page's whole argument is that the course
 *   marks pronunciation against the sounds Bangla lacks. A demo that graded
 *   with a lookalike would be advertising a product that does not exist, and no
 *   type checker can tell the difference.
 * - **A typed sentence is never given a pronunciation score.** Running the
 *   confusion map over text somebody typed produces a number that looks exactly
 *   like a pronunciation score and is not one.
 * - **Silence is not a bad attempt.** Scored 0 with "nothing was heard", never
 *   "your pronunciation was wrong" — telling somebody their mouth is wrong when
 *   the microphone never opened is both untrue and the reason people quit.
 * - **It writes nothing.** An anonymous visitor has no profile, and the absence
 *   of any write is easier to break than to notice.
 */
import { describe, expect, it, vi } from 'vitest';
import { type ISpeechScorer } from '@/modules/shared/application/ports/speech-scorer';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { MissingReferenceError } from '@/modules/shared/domain/errors/missing-reference.error';
import { ConfusionMapSpeechScorer } from '@/modules/speech/infrastructure/adapters/confusion-map-speech-scorer';
import { Phoneme } from '../../domain/entities/phoneme';
import { Word } from '../../domain/entities/word';
import { type IPhonemeRepository } from '../../domain/repositories/phoneme-repository';
import { type IWordPhonemeRepository } from '../../domain/repositories/word-phoneme-repository';
import { type IWordRepository } from '../../domain/repositories/word-repository';
import { ScoreDemoSpeechUseCase } from './score-demo-speech';

/** Enough of the 44 to segment `very` and `visit`. */
const INVENTORY: readonly Phoneme[] = [
  new Phoneme('ph-v', IpaTranscription.of('v'), 'consonant', null, 'labiodental fricative', 'ভ'),
  new Phoneme('ph-e', IpaTranscription.of('e'), 'vowel', 'এ', 'mid front vowel', null),
  new Phoneme('ph-r', IpaTranscription.of('r'), 'consonant', null, 'approximant', 'র'),
  new Phoneme('ph-i', IpaTranscription.of('i'), 'vowel', 'ই', 'close front vowel', null),
  new Phoneme('ph-ɪ', IpaTranscription.of('ɪ'), 'vowel', 'ই', 'near-close front vowel', null),
  new Phoneme('ph-z', IpaTranscription.of('z'), 'consonant', null, 'alveolar fricative', 'জ'),
  new Phoneme('ph-t', IpaTranscription.of('t'), 'consonant', null, 'alveolar stop', 'ট'),
  new Phoneme('ph-s', IpaTranscription.of('s'), 'consonant', 'স', 'alveolar fricative', null),
];

const VERY = new Word(
  'w-very',
  'very',
  IpaTranscription.of('veri'),
  ['ve', 'ry'],
  'ভেরি',
  'খুব',
  'adverb',
  null,
  1,
  null,
  ['wery'],
);

function build(options: {
  readonly word?: Word | null;
  readonly scorer?: ISpeechScorer;
  readonly onListAll?: () => void;
} = {}): ScoreDemoSpeechUseCase {
  const words: IWordRepository = {
    findById: () => Promise.resolve(options.word === undefined ? VERY : options.word),
    findByIds: () => Promise.reject(new Error('not used')),
    findUpToWeek: () => Promise.reject(new Error('not used')),
    search: () => Promise.reject(new Error('not used')),
  };

  const wordPhonemes: IWordPhonemeRepository = {
    findByWordIds: () => Promise.resolve([]),
  };

  const phonemes: IPhonemeRepository = {
    listAll: () => {
      options.onListAll?.();

      return Promise.resolve(INVENTORY);
    },
    findByIds: () => Promise.reject(new Error('the demo reads the whole inventory once')),
  };

  return new ScoreDemoSpeechUseCase(
    words,
    wordPhonemes,
    phonemes,
    options.scorer ?? new ConfusionMapSpeechScorer(),
  );
}

describe('scoring a spoken attempt for a visitor', () => {
  it('marks a correct word highly and finds nothing to fix', async () => {
    const result = await build().execute({
      wordId: 'w-very',
      transcript: 'very',
      mode: 'word',
    });

    expect(result.scorePercent).toBeGreaterThan(90);
    expect(result.diagnoses).toEqual([]);
    expect(result.isClean).toBe(true);
    expect(result.heard).toBe('very');
    expect(result.sentence).toBeNull();
  });

  it('names the v/w substitution instead of just marking it down', async () => {
    // The error the whole course is about. A score of 0 with no explanation is
    // what `07-speech-scoring.md` says drives learners off.
    const result = await build().execute({
      wordId: 'w-very',
      transcript: 'wery',
      mode: 'word',
    });

    expect(result.isClean).toBe(false);
    expect(result.diagnoses.length).toBeGreaterThan(0);
    expect(result.diagnoses[0]?.articulationFix).not.toBe('');
    // Not zero. Every other sound in the word was right.
    expect(result.scorePercent).toBeGreaterThan(0);
  });

  it('treats silence as nothing heard, never as bad pronunciation', async () => {
    const result = await build().execute({ wordId: 'w-very', transcript: '', mode: 'word' });

    expect(result.isNotHeard).toBe(true);
    expect(result.scorePercent).toBe(0);
    expect(result.diagnoses[0]?.articulationFix).toMatch(/nothing was heard/iu);
  });

  it('finds the word inside a sentence the recogniser heard', async () => {
    const result = await build().execute({
      wordId: 'w-very',
      transcript: 'the film was very good',
      mode: 'sentence',
    });

    expect(result.heard).toBe('very');
    expect(result.sentence).toEqual({
      usesTheWord: true,
      wordCount: 5,
      isSentenceLength: true,
    });
  });

  it('says so when the word was left out of the sentence', async () => {
    const result = await build().execute({
      wordId: 'w-very',
      transcript: 'the film was good',
      mode: 'sentence',
    });

    expect(result.sentence?.usesTheWord).toBe(false);
  });

  it('calls a fragment a fragment', async () => {
    const result = await build().execute({
      wordId: 'w-very',
      transcript: 'very good',
      mode: 'sentence',
    });

    expect(result.sentence?.isSentenceLength).toBe(false);
    expect(result.sentence?.wordCount).toBe(2);
  });

  it('never gives typed text a pronunciation score', async () => {
    const listAll = vi.fn();

    const result = await build({ onListAll: listAll }).execute({
      wordId: 'w-very',
      transcript: 'The film was very good.',
      mode: 'sentence-written',
    });

    expect(result.scorePercent).toBeNull();
    expect(result.heard).toBe('');
    expect(result.diagnoses).toEqual([]);
    expect(result.sentence?.usesTheWord).toBe(true);

    // And it does not pay for the reads either — there is nothing for the
    // scorer to do, so the phoneme inventory is never loaded.
    expect(listAll).not.toHaveBeenCalled();
  });

  it('refuses a word id that is not a word', async () => {
    await expect(
      build({ word: null }).execute({ wordId: 'nope', transcript: 'very', mode: 'word' }),
    ).rejects.toBeInstanceOf(MissingReferenceError);
  });
});
