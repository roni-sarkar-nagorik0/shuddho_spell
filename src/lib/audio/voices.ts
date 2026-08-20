/**
 * Choosing which voice actually speaks.
 *
 * Setting `utterance.lang` and stopping there — which is what both callers used
 * to do — leaves the choice to the browser, and the browser's default for
 * `en-GB` is usually the small offline voice that ships with the OS. Those
 * voices are built for battery and disk, not for clarity, and a single word
 * with no sentence around it is the hardest thing to make out from one: there
 * is no context to recover a mangled vowel from. Dictation is the one exercise
 * where that matters most, and it was getting the worst voice available.
 *
 * So the ranking below prefers, in order: the network and "enhanced" voices
 * (Google's `en-*` set, Apple's Siri and Premium/Enhanced downloads, Microsoft's
 * Natural voices), then any exact language match, then anything speaking the
 * same language at all. It is best-effort by nature — a device has whatever
 * voices it has — but on every browser that offers a better one, the better one
 * is now what a learner hears.
 */

/**
 * Names that mark a higher-quality voice across the three engines that matter.
 * Matched case-insensitively against `voice.name`, because the exact casing
 * differs by platform and by locale.
 */
const PREFERRED_MARKERS: readonly string[] = [
  'google',
  'natural',
  'enhanced',
  'premium',
  'siri',
  'neural',
];

function normaliseLang(value: string): string {
  return value.replace('_', '-').toLowerCase();
}

function isPreferred(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();

  return PREFERRED_MARKERS.some((marker) => name.includes(marker));
}

/**
 * The best available voice for a BCP-47 tag such as `en-GB`, or `null` when the
 * device has nothing for it.
 *
 * `null` is a real answer and callers must handle it: leaving
 * `utterance.voice` unset makes the browser fall back to `lang`, which is
 * exactly the right behaviour when there is nothing better to say.
 */
export function preferredVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const wanted = normaliseLang(lang);
  const language = wanted.slice(0, 2);

  const exact = voices.filter((voice) => normaliseLang(voice.lang) === wanted);
  const sameLanguage = voices.filter((voice) => normaliseLang(voice.lang).startsWith(language));

  return (
    exact.find(isPreferred) ??
    // A network voice is downloaded rather than bundled, which on every engine
    // here means it is the larger, clearer one.
    exact.find((voice) => !voice.localService) ??
    exact[0] ??
    sameLanguage.find(isPreferred) ??
    sameLanguage[0] ??
    null
  );
}

/**
 * Whether the device can speak a language at all — what the demo's accent
 * control is built from, so it never offers a choice that would silently do
 * nothing.
 */
export function hasVoiceFor(voices: readonly SpeechSynthesisVoice[], lang: string): boolean {
  return preferredVoice(voices, lang) !== null;
}

/**
 * How fast to say **one word with no sentence around it**.
 *
 * Slower than speech, and deliberately so. The product's `playback_rate`
 * default is 1.00 and that is right for a sentence; a lone word at 1.00 is over
 * before a listener who is still deciding which language they are hearing has
 * settled. 0.85 is slow enough to separate the consonants and fast enough not
 * to distort the vowels, which is what happens below about 0.6 on the offline
 * voices.
 */
export const DICTATION_RATE = 0.85;

/** The second press, for a listener who did not catch it. As slow as is useful. */
export const DICTATION_SLOW_RATE = 0.6;
