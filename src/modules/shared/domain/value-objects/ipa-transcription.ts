import { InvalidValueError } from '../errors/invalid-value.error';

/**
 * Delimiters belong to the notation, not the data. `/ˈwɔːtə/` and `[ˈwɔːtə]`
 * are the phonemic and phonetic ways of writing the same transcription, and
 * storing either means every comparison has to strip them first.
 */
const DELIMITERS = /[/[\]]/u;

/**
 * An IPA transcription, stored bare.
 *
 * `phonemes.symbol` is commented "Bare IPA, no slash delimiters" in 002 and
 * nothing enforced it. This does. The rule is not cosmetic: a learner's
 * pronunciation is scored by comparing transcriptions, and `/wɔː/` never equals
 * `wɔː`.
 *
 * Anything beyond "non-empty and undelimited" is deliberately not validated —
 * checking a string against the IPA chart would mean encoding the chart, and
 * `06`/`07` treat the transcription as opaque to everything but the scorer.
 */
export class IpaTranscription {
  private constructor(readonly value: string) {}

  static of(value: string): IpaTranscription {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueError('IpaTranscription', 'empty', 'must contain a transcription');
    }

    if (DELIMITERS.test(trimmed)) {
      throw new InvalidValueError(
        'IpaTranscription',
        JSON.stringify(trimmed),
        'must be bare IPA — no / / or [ ] delimiters',
      );
    }

    return new IpaTranscription(trimmed);
  }

  equals(other: IpaTranscription): boolean {
    return this.value === other.value;
  }
}
