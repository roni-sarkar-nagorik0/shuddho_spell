'use client';

import { useCallback, useEffect, useState } from 'react';
import { preferredVoice } from './voices';

/**
 * Saying something out loud, for the two panels on the marketing page.
 *
 * It exists because there were about to be **two identical copies** of it. The
 * dictation demo had the only one — cancel before speak, read the voice list at
 * call time, fall back to the browser's default when the device has nothing —
 * and the alphabet strip needs precisely the same three rules. Copying them
 * would mean the next fix to any of the three landing in one place and not the
 * other.
 *
 * It deliberately does **not** replace `components/lesson/audio-manager.tsx`.
 * That one queues, reports progress and is driven by a lesson's state machine;
 * this one says a thing when somebody presses a button. Merging them would give
 * the marketing page a state machine it has no use for.
 *
 * `supported` is false on Firefox and on several mobile browsers, and callers
 * are expected to show something readable instead rather than render a button
 * that does nothing.
 */
export interface ISpeech {
  readonly supported: boolean;
  readonly say: (text: string, rate: number, lang: string) => void;
}

export function useSpeech(): ISpeech {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(available());

    return () => {
      // Navigating away must not leave a voice talking over the next page.
      if (available()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const say = useCallback((text: string, rate: number, lang: string) => {
    if (!available()) {
      return;
    }

    // Cancel before speak, unconditionally — the same rule the lesson's audio
    // manager holds, and for the same reason: the check is the bug.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    // The ranked voice, not the browser's default for the tag — the default is
    // the small offline one, which is the least intelligible on the device.
    // Read at call time: by the first click the engine has finished loading
    // even when it had not at mount.
    const voice = preferredVoice(window.speechSynthesis.getVoices(), lang);

    if (voice !== null) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  return { supported, say };
}

function available(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
