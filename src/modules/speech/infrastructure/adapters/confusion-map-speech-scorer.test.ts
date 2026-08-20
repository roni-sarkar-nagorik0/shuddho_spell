// @vitest-environment node
/**
 * The ≥40-case table the exit gate asks for, run through the **port** rather
 * than through the services behind it.
 *
 * Test-writing is paused for this run (CLAUDE.md section 0), and this file is
 * the exception the pause itself allows for: F6.7 *is* a table of cases. There
 * is nothing else to build for it, and shipping it unrun would be shipping it
 * unbuilt.
 *
 * Through the port on purpose. Every claim `07-speech-scoring.md` makes is
 * about what a learner is told — 65 not 0, a named fix, no fix invented for an
 * error they did not make — and all of those are properties of the answer, not
 * of any one service. A suite written against `PhonemeComparer` would still
 * pass if the blend were wired backwards.
 */
import { describe, expect, it } from 'vitest';
import { Phoneme } from '@/modules/library/domain/entities/phoneme';
import { IpaSegmenter } from '@/modules/library/domain/services/ipa-segmenter';
import { IpaTranscription } from '@/modules/shared/domain/value-objects/ipa-transcription';
import { type ISpokenForm } from '@/modules/shared/application/ports/speech-scorer';
import { BengaliConfusionMap } from '../../domain/data/bengali-confusion-map';
import { ConfusionMapSpeechScorer } from './confusion-map-speech-scorer';

/**
 * The 44 symbols of `010_seed_reference.sql`, copied from the migration rather
 * than invented here — a suite that segments against a different inventory
 * from the one in the database is testing a scorer nobody ships.
 */
const SEEDED_SYMBOLS = [
  'iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɔː', 'ʊ', 'uː', 'ʌ', 'ɜː', 'ə',
  'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ', 'ɪə', 'eə', 'ʊə',
  'p', 'b', 't', 'd', 'k', 'ɡ', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð',
  's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'w', 'j',
];

const segmenter = IpaSegmenter.fromPhonemes(
  SEEDED_SYMBOLS.map(
    (symbol, index) =>
      new Phoneme(`phoneme-${String(index)}`, IpaTranscription.of(symbol), 'consonant', null, '', null),
  ),
);

const map = new BengaliConfusionMap();
const scorer = new ConfusionMapSpeechScorer(map);

function spokenForm(ipa: string): ISpokenForm {
  const sequence = segmenter.segment(IpaTranscription.of(ipa));

  return { phonemes: sequence.symbols(), stressIndex: sequence.stressedPosition() };
}

interface ICase {
  readonly text: string;
  readonly ipa: string;
  readonly heard: string;
  /** An observed pronunciation. Only a stress error needs one. */
  readonly observedIpa: string | null;
  readonly min: number;
  readonly max: number;
  /** Confusion ids whose fixes must appear, in any order. */
  readonly diagnoses: readonly string[];
}

function score(entry: ICase): ReturnType<ConfusionMapSpeechScorer['score']> {
  return scorer.score({
    expectedText: entry.text,
    expected: spokenForm(entry.ipa),
    heardTranscript: entry.heard,
    heard: entry.observedIpa === null ? null : spokenForm(entry.observedIpa),
  });
}

function testCase(
  text: string,
  ipa: string,
  heard: string,
  min: number,
  max: number,
  diagnoses: readonly string[] = [],
  observedIpa: string | null = null,
): ICase {
  return { text, ipa, heard, observedIpa, min, max, diagnoses };
}

/** A correct attempt is in the high 90s — `07` says so in those words. */
const CORRECT: readonly ICase[] = [
  testCase('very', 'ˈveri', 'very', 95, 100),
  testCase('water', 'ˈwɔːtə', 'water', 95, 100),
  testCase('school', 'skuːl', 'school', 95, 100),
  testCase('think', 'θɪŋk', 'think', 95, 100),
  testCase('station', 'ˈsteɪʃən', 'station', 95, 100),
  testCase('asked', 'ɑːskt', 'asked', 95, 100),
];

/**
 * One near miss per confusion the gate names, and two apiece for the ones a
 * single word could get right by accident.
 */
const NEAR_MISSES: readonly ICase[] = [
  testCase('very', 'ˈveri', 'wery', 65, 90, ['v-heard-as-w']),
  testCase('wine', 'waɪn', 'vine', 65, 90, ['w-heard-as-v']),
  testCase('think', 'θɪŋk', 'tink', 65, 90, ['theta-heard-as-t']),
  testCase('thin', 'θɪn', 'tin', 65, 90, ['theta-heard-as-t']),
  testCase('this', 'ðɪs', 'dis', 65, 90, ['eth-heard-as-d']),
  testCase('they', 'ðeɪ', 'day', 65, 90, ['eth-heard-as-d']),
  testCase('zoo', 'zuː', 'joo', 65, 90, ['z-heard-as-j']),
  testCase('zero', 'ˈzɪərəʊ', 'jero', 65, 90, ['z-heard-as-j']),
  testCase('ship', 'ʃɪp', 'sip', 65, 90, ['esh-heard-as-s']),
  testCase('shop', 'ʃɒp', 'sop', 65, 90, ['esh-heard-as-s']),
  testCase('sea', 'siː', 'shea', 65, 90, ['s-heard-as-esh']),
  testCase('cat', 'kæt', 'ket', 65, 90, ['ash-heard-as-e']),
  testCase('bad', 'bæd', 'bed', 65, 90, ['ash-heard-as-e']),
  testCase('school', 'skuːl', 'ischool', 65, 90, ['epenthesis-before-sk']),
  testCase('speak', 'spiːk', 'ispeak', 65, 90, ['epenthesis-before-sp']),
  testCase('station', 'ˈsteɪʃən', 'istation', 65, 90, ['epenthesis-before-st']),
  testCase('asked', 'ɑːskt', 'ask', 65, 90, ['final-cluster-dropped']),
  testCase('texts', 'teksts', 'text', 65, 90, ['final-cluster-dropped']),
  testCase('hotel', 'həʊˈtel', 'hotel', 65, 90, ['first-syllable-stress'], 'ˈhəʊtel'),
];

/** Low, and **silent**: a fix for an error nobody made is worse than none. */
const UNRELATED: readonly ICase[] = [
  testCase('very', 'ˈveri', 'elephant', 0, 49),
  testCase('cat', 'kæt', 'window', 0, 49),
  testCase('school', 'skuːl', 'banana', 0, 49),
  testCase('water', 'ˈwɔːtə', 'xylophone', 0, 49),
  testCase('think', 'θɪŋk', 'orange', 0, 49),
];

const NOT_HEARD: readonly ICase[] = [
  testCase('very', 'ˈveri', '', 0, 0),
  testCase('water', 'ˈwɔːtə', '   ', 0, 0),
  testCase('school', 'skuːl', '', 0, 0),
];

/** The recogniser chose a different spelling of the same sound. Not an error. */
const HOMOPHONES: readonly ICase[] = [
  testCase('there', 'ðeə', 'their', 95, 100),
  testCase('to', 'tuː', 'two', 95, 100),
  testCase('see', 'siː', 'sea', 95, 100),
  testCase('know', 'nəʊ', 'no', 95, 100),
];

/** The API heard the room. The target is found; the extras cost nothing. */
const EXTRA_WORDS: readonly ICase[] = [
  testCase('water', 'ˈwɔːtə', 'so anyway water right', 95, 100),
  testCase('very', 'ˈveri', 'um very yes', 95, 100),
  testCase('school', 'skuːl', 'the school please', 95, 100),
  testCase('cat', 'kæt', 'a cat', 95, 100),
  testCase('very', 'ˈveri', 'i said wery sorry', 65, 90, ['v-heard-as-w']),
];

const ALL: readonly ICase[] = [
  ...CORRECT,
  ...NEAR_MISSES,
  ...UNRELATED,
  ...NOT_HEARD,
  ...HOMOPHONES,
  ...EXTRA_WORDS,
];

describe('the confusion-map speech scorer', () => {
  it('has at least the forty cases the gate asks for', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(40);
  });

  it.each(ALL.map((entry) => [`${entry.text} heard as "${entry.heard}"`, entry] as const))(
    'scores %s inside its band',
    (_label, entry) => {
      const result = score(entry);

      expect(result.scorePercent).toBeGreaterThanOrEqual(entry.min);
      expect(result.scorePercent).toBeLessThanOrEqual(entry.max);
    },
  );

  it.each(NEAR_MISSES.map((entry) => [`${entry.text} heard as "${entry.heard}"`, entry] as const))(
    'names the right fix for %s',
    (_label, entry) => {
      const fixes = score(entry).diagnoses.map((diagnosis) => diagnosis.articulationFix);

      for (const id of entry.diagnoses) {
        expect(fixes).toContain(map.byId(id)?.articulationFix);
      }
    },
  );

  it.each(UNRELATED.map((entry) => [`${entry.text} heard as "${entry.heard}"`, entry] as const))(
    'invents no diagnosis for %s',
    (_label, entry) => {
      expect(score(entry).diagnoses).toEqual([]);
    },
  );

  it.each(NOT_HEARD.map((entry) => [entry.text, entry] as const))(
    'answers silence on %s with a not-heard diagnosis, not a crash',
    (_label, entry) => {
      const result = score(entry);

      expect(result.scorePercent).toBe(0);
      expect(result.diagnoses).toHaveLength(1);
      expect(result.diagnoses[0]?.articulationFix).toMatch(/nothing was heard/iu);
      expect(result.perPhoneme).toEqual([]);
    },
  );

  it('never scores a named near miss at zero', () => {
    for (const entry of NEAR_MISSES) {
      expect(score(entry).scorePercent).toBeGreaterThan(0);
    }
  });

  it('gives a confused sound partial credit rather than none', () => {
    for (const entry of NEAR_MISSES.filter((near) => near.observedIpa === null)) {
      const damaged = score(entry).perPhoneme.filter((phoneme) => phoneme.credit < 1);

      expect(damaged.length, `${entry.text} → ${entry.heard}`).toBeGreaterThan(0);

      for (const phoneme of damaged) {
        expect(phoneme.credit, `${entry.text} → ${entry.heard}`).toBeGreaterThan(0);
      }
    }
  });

  it('carries expected, heard and a fix on every diagnosis it issues', () => {
    for (const entry of ALL) {
      for (const diagnosis of score(entry).diagnoses) {
        expect(diagnosis).toHaveProperty('expected');
        expect(diagnosis).toHaveProperty('heard');
        expect(diagnosis.expected.length, entry.text).toBeGreaterThan(0);
        expect(diagnosis.articulationFix.length, entry.text).toBeGreaterThan(0);
      }
    }
  });

  it('returns a whole percentage inside 0..100 for every case', () => {
    for (const entry of ALL) {
      const percent = score(entry).scorePercent;

      expect(Number.isInteger(percent), entry.text).toBe(true);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    }
  });

  it('covers every confusion the map declares', () => {
    const exercised = new Set(NEAR_MISSES.flatMap((entry) => entry.diagnoses));

    expect([...map.all()].map((confusion) => confusion.id).filter((id) => !exercised.has(id))).toEqual(
      [],
    );
  });
});
