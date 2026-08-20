'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

export interface IAudioPreferences {
  readonly accent: 'british' | 'american';
  /** 0.5 to 2. The profile's own value, clamped by the browser anyway. */
  readonly playbackRate: number;
}

export interface IAudioApi {
  /** Speaks, **after cancelling whatever was speaking**. Always, unconditionally. */
  readonly speak: (text: string, options?: { readonly rate?: number }) => void;
  readonly cancel: () => void;
  /** The text currently speaking, or `null`. Drives every "playing" indicator. */
  readonly speaking: string | null;
  readonly supported: boolean;
}

const AudioContext = createContext<IAudioApi | null>(null);

const VOICE_LANG: Readonly<Record<IAudioPreferences['accent'], string>> = {
  british: 'en-GB',
  american: 'en-US',
};

/**
 * Throws outside its provider rather than returning a no-op, for the reason
 * `useToast` and `useSession` do: audio that silently does nothing is a bug
 * nobody notices in review and every learner notices in production.
 */
export function useAudio(): IAudioApi {
  const api = useContext(AudioContext);

  if (api === null) {
    throw new Error('useAudio must be used inside <AudioProvider>');
  }

  return api;
}

/**
 * One place that speaks.
 *
 * **Cancel before speak, every time, without checking whether anything is
 * currently playing** — the check is the bug. `13-frontend.md` calls
 * overlapping utterances the single most common defect in speech-synthesis
 * interfaces, and it happens precisely because callers guard the cancel behind
 * a condition that is false for the few milliseconds between one utterance
 * ending and the next starting.
 *
 * The accent and the rate come from the learner's profile, resolved on the
 * server and passed in — a learner who chose American English and 0.8× gets
 * that everywhere, not only on the screen that remembered to ask.
 *
 * Voice selection is best-effort: `getVoices()` is asynchronous in Chrome and
 * returns an empty list on first call, so the manager sets `lang` (which always
 * works) and upgrades to a matching named voice when the list arrives.
 */
export function AudioProvider({
  preferences,
  children,
}: {
  readonly preferences: IAudioPreferences;
  readonly children: ReactNode;
}): ReactElement {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const voice = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return undefined;
    }

    setSupported(true);

    const lang = VOICE_LANG[preferences.accent];

    const pickVoice = (): void => {
      const voices = window.speechSynthesis.getVoices();
      voice.current =
        voices.find((candidate) => candidate.lang.replace('_', '-') === lang) ??
        voices.find((candidate) => candidate.lang.startsWith(lang.slice(0, 2))) ??
        null;
    };

    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice);
      // Leaving the lesson must not leave a voice talking over the next screen.
      window.speechSynthesis.cancel();
    };
  }, [preferences.accent]);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(null);
  }, []);

  const speak = useCallback(
    (text: string, options?: { readonly rate?: number }) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || text === '') {
        return;
      }

      // Unconditional. This line is the feature.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = VOICE_LANG[preferences.accent];
      utterance.rate = options?.rate ?? preferences.playbackRate;

      if (voice.current !== null) {
        utterance.voice = voice.current;
      }

      utterance.onend = () => { setSpeaking(null); };
      utterance.onerror = () => { setSpeaking(null); };

      setSpeaking(text);
      window.speechSynthesis.speak(utterance);
    },
    [preferences.accent, preferences.playbackRate],
  );

  const api = useMemo(
    () => ({ speak, cancel, speaking, supported }),
    [speak, cancel, speaking, supported],
  );

  return <AudioContext.Provider value={api}>{children}</AudioContext.Provider>;
}
