'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bestResult,
  createRecogniser,
  isSpeechRecognitionSupported,
  PERMISSION_DENIED_ERRORS,
  type ISpeechRecogniser,
} from './speech-recognition';

/**
 * `idle` before and after, `listening` while the microphone is open, and two
 * end states that are **not** the same thing.
 *
 * `denied` is a browser permission the visitor can grant and a message can
 * point at; `error` is anything else. Collapsing them into one state is how a
 * product ends up telling somebody "something went wrong" when the fix is two
 * clicks away in their address bar.
 */
export type MicState = 'idle' | 'listening' | 'denied' | 'error';

export interface IMicrophone {
  /**
   * False on Firefox and several mobile browsers. The caller **must** render a
   * path that works without it rather than a disabled button —
   * `13-frontend.md`: "never a dead button".
   */
  readonly supported: boolean;
  readonly state: MicState;
  /** The last thing the recogniser wrote down. Cleared when listening starts. */
  readonly transcript: string;
  readonly listen: () => void;
  readonly stop: () => void;
  /** Back to `idle` with no transcript, for starting a fresh attempt. */
  readonly reset: () => void;
}

export interface IMicrophoneOptions {
  /** BCP-47, and the same tag the audio is spoken in. */
  readonly lang: string;
  readonly onTranscript: (transcript: string) => void;
  /**
   * Run just before the microphone opens. Speech synthesis and recognition on
   * the same device fight over the audio path, so every caller so far uses this
   * to stop whatever is speaking.
   */
  readonly beforeListen?: (() => void) | undefined;
}

/**
 * One microphone attempt, with the three things `13-frontend.md` says get
 * shipped broken.
 *
 * **Feature detection, not a disabled button.** `supported` is resolved in an
 * effect rather than during render: the server has no `window`, and deciding it
 * during SSR would either crash or hydrate the wrong branch.
 *
 * **The recording state is unambiguous**, because the caller is handed a state
 * rather than a boolean and can change colour, label, icon and `aria-pressed`
 * from it.
 *
 * **Permission-denied is its own state**, not an error, so the caller can
 * explain where the setting lives instead of showing a shrug.
 *
 * It exists as a hook because the landing page's flow needs exactly this
 * lifecycle and the lesson's speak stage already had it, written out by hand.
 * Two copies of `onresult`/`onerror`/`onend` and an `abort` on unmount is two
 * places for the next fix to land in one of.
 *
 * It lives beside `speech-recognition.ts` rather than in `lib/audio` with
 * `useSpeech`, and not by preference: `lib` may not import `components`, the
 * declarations it needs are in `components/lesson`, and moving *those* would be
 * a change to the lesson's shipped code for the sake of a tidier address.
 *
 * **No audio leaves the browser and none is retained here.** The Web Speech API
 * transcribes locally; this holds a string. `07-speech-scoring.md` requires
 * that, and a hook that returned a blob would be where it stopped being true.
 */
export function useMicrophone(options: IMicrophoneOptions): IMicrophone {
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');
  const recogniser = useRef<ISpeechRecogniser | null>(null);

  // The callbacks are read through a ref so that changing them does not tear
  // down a microphone that is already open — a re-render mid-attempt would
  // otherwise abort the listen the visitor is in the middle of.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());

    return () => {
      // Leaving the page must not leave a microphone open.
      recogniser.current?.abort();
    };
  }, []);

  const listen = useCallback(() => {
    const engine = createRecogniser();

    if (engine === null) {
      setSupported(false);
      return;
    }

    latest.current.beforeListen?.();

    engine.lang = latest.current.lang;
    engine.continuous = false;
    engine.interimResults = false;
    engine.maxAlternatives = 1;

    engine.onresult = (event) => {
      const heard = bestResult(event);

      if (heard !== null) {
        setTranscript(heard.transcript);
        latest.current.onTranscript(heard.transcript);
      }
    };

    engine.onerror = (event) => {
      setState(PERMISSION_DENIED_ERRORS.includes(event.error) ? 'denied' : 'error');
    };

    engine.onend = () => {
      // Only from `listening`. A denial or an error has already said something
      // more specific, and `onend` fires after both.
      setState((current) => (current === 'listening' ? 'idle' : current));
    };

    recogniser.current = engine;
    setTranscript('');
    setState('listening');
    engine.start();
  }, []);

  const stop = useCallback(() => {
    recogniser.current?.stop();
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    recogniser.current?.abort();
    setTranscript('');
    setState('idle');
  }, []);

  return { supported, state, transcript, listen, stop, reset };
}
