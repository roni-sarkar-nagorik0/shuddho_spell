'use client';

/**
 * The Web Speech API, feature-detected honestly.
 *
 * `lib.dom` does not declare `webkitSpeechRecognition`, and the prefixed name
 * is still the only one Chrome and Safari expose. These declarations describe
 * exactly the surface this product uses — one result, one transcript, three
 * events — rather than restating the whole spec.
 *
 * `07-speech-scoring.md` is emphatic that **the server never receives audio**.
 * Everything here stays in the browser; only the transcript leaves.
 */

export interface ISpeechResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface IRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface IRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  readonly [index: number]: IRecognitionAlternative;
}

interface IRecognitionResultList {
  readonly length: number;
  readonly [index: number]: IRecognitionResult;
}

interface IRecognitionEvent {
  readonly resultIndex: number;
  readonly results: IRecognitionResultList;
}

interface IRecognitionErrorEvent {
  readonly error: string;
}

export interface ISpeechRecogniser {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: IRecognitionEvent) => void) | null;
  onerror: ((event: IRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface ISpeechWindow {
  readonly SpeechRecognition?: new () => ISpeechRecogniser;
  readonly webkitSpeechRecognition?: new () => ISpeechRecogniser;
}

/**
 * `null` on Firefox and on several mobile browsers. The caller **must** render
 * the self-assessment fallback rather than a disabled button —
 * `13-frontend.md`: "never a dead button".
 */
export function createRecogniser(): ISpeechRecogniser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const candidate = window as unknown as ISpeechWindow;
  const Recogniser = candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition;

  if (Recogniser === undefined) {
    return null;
  }

  return new Recogniser();
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const candidate = window as unknown as ISpeechWindow;

  return candidate.SpeechRecognition !== undefined || candidate.webkitSpeechRecognition !== undefined;
}

/** The best alternative of the last result, or `null` when nothing was heard. */
export function bestResult(event: IRecognitionEvent): ISpeechResult | null {
  const result = event.results[event.results.length - 1];

  if (result === undefined) {
    return null;
  }

  const alternative = result[0];

  return alternative === undefined
    ? null
    : { transcript: alternative.transcript, confidence: alternative.confidence };
}

export const PERMISSION_DENIED_ERRORS = Object.freeze(['not-allowed', 'service-not-allowed']);
