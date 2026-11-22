/**
 * HACKBYTE (HealPath / QueueCare) - Voice & Speech Engine
 * Multilingual Speech-to-Text (STT) and Text-to-Speech (TTS)
 * Localized for Marathi (mr-IN), Hindi (hi-IN), and Indian English (en-IN).
 * Designed with fallback resilience for elderly and rural outpatients.
 */

export const isSpeechRecognitionSupported = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export const isSpeechSynthesisSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
};

export const getLangLocale = (lang) => {
  if (lang === 'mr') return 'mr-IN';
  if (lang === 'hi') return 'hi-IN';
  return 'en-IN';
};

/**
 * Strips markdown symbols, asterisks, brackets, and emojis for smooth TTS pronunciation.
 */
export const sanitizeTextForSpeech = (text) => {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[*_#`~]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/⚠️|🚨|📞|📅|🎫|👨‍⚕️|⏳/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Finds the most suitable voice for the requested language.
 * Falls back gracefully to Hindi or Indian English if a dedicated Marathi voice is not installed.
 */
export const getBestVoice = (lang) => {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLocale = getLangLocale(lang).toLowerCase();
  const prefix = targetLocale.split('-')[0];

  // 1. Direct locale match (e.g. mr-IN, hi-IN, en-IN)
  let matched = voices.find(v => v.lang.toLowerCase() === targetLocale);
  if (matched) return matched;

  // 2. Language prefix match (e.g. mr, hi)
  matched = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
  if (matched) return matched;

  // 3. Fallback for Marathi: Hindi voices (e.g., Google हिन्दी, Microsoft Swara) pronounce Devanagari text very well
  if (lang === 'mr') {
    matched = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
    if (matched) return matched;
  }

  // 4. Fallback: Indian English
  matched = voices.find(v => v.lang.toLowerCase() === 'en-in' || v.name.toLowerCase().includes('india'));
  if (matched) return matched;

  // 5. Default voice
  return voices.find(v => v.default) || voices[0] || null;
};

/**
 * Speaks text using window.speechSynthesis with configurable rate, pitch, and callbacks.
 */
export const speakText = (text, {
  lang = 'en',
  rate = 1.0,
  pitch = 1.0,
  volume = 1.0,
  onStart = null,
  onEnd = null,
  onError = null
} = {}) => {
  if (!isSpeechSynthesisSupported()) {
    onError?.('Speech synthesis not supported in this browser');
    return null;
  }

  try {
    window.speechSynthesis.cancel();
    const clean = sanitizeTextForSpeech(text);
    if (!clean) {
      onEnd?.();
      return null;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = getLangLocale(lang);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    const voice = getBestVoice(lang);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => {
      // Ignore user-initiated cancellation errors
      if (e.error === 'canceled' || e.error === 'interrupted') {
        onEnd?.();
      } else {
        onError?.(e.error || 'TTS playback error');
      }
    };

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (err) {
    onError?.(err.message || 'TTS failure');
    return null;
  }
};

export const stopSpeech = () => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Safe noop
    }
  }
};

export const pauseSpeech = () => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.pause();
    } catch {
      // Safe noop
    }
  }
};

export const resumeSpeech = () => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // Safe noop
    }
  }
};

/**
 * Factory for browser SpeechRecognition with explicit lifecycle controls.
 */
export const createSpeechRecognizer = ({
  lang = 'en',
  onInterim = null,
  onFinal = null,
  onError = null,
  onStart = null,
  onEnd = null
}) => {
  if (!isSpeechRecognitionSupported()) {
    return {
      isSupported: false,
      start: () => onError?.('Speech recognition is not supported in this browser'),
      stop: () => {},
      abort: () => {}
    };
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognizer = new SpeechRecognition();
  recognizer.continuous = false;
  recognizer.interimResults = true;
  recognizer.lang = getLangLocale(lang);

  let hasDispatchedFinal = false;

  recognizer.onstart = () => {
    hasDispatchedFinal = false;
    onStart?.();
  };

  recognizer.onresult = (event) => {
    let interimText = '';
    let finalText = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript;
      } else {
        interimText += transcript;
      }
    }

    if (interimText && onInterim) {
      onInterim(interimText);
    }

    if (finalText && !hasDispatchedFinal) {
      hasDispatchedFinal = true;
      onFinal?.(finalText.trim());
    }
  };

  recognizer.onerror = (event) => {
    let friendlyError = 'Speech recognition error';
    if (event.error === 'not-allowed') {
      friendlyError = 'Microphone permission denied. Please allow microphone access.';
    } else if (event.error === 'no-speech') {
      friendlyError = 'No speech detected. Please try again.';
    } else if (event.error === 'network') {
      friendlyError = 'Network error during speech recognition.';
    }
    onError?.(friendlyError, event.error);
  };

  recognizer.onend = () => {
    onEnd?.();
  };

  return {
    isSupported: true,
    start: () => {
      try {
        hasDispatchedFinal = false;
        recognizer.lang = getLangLocale(lang);
        recognizer.start();
      } catch (err) {
        if (err.name !== 'InvalidStateError') {
          onError?.(err.message, err.name);
        }
      }
    },
    stop: () => {
      try {
        recognizer.stop();
      } catch {
        // Safe noop
      }
    },
    abort: () => {
      try {
        recognizer.abort();
      } catch {
        // Safe noop
      }
    }
  };
};
