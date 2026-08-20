import { type PhonemeEntry } from './schema';

/**
 * The 44 phonemes of English, annotated for a Bengali speaker.
 *
 * **Filled by F9.3.** Empty is honest here rather than a stub: the validator
 * runs, reports a count of zero, and the count check in the phase gate is what
 * notices. A placeholder entry would pass a count and teach nobody anything.
 */
export const PHONEMES: readonly PhonemeEntry[] = [];
