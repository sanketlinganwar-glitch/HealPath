import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Volume2, VolumeX, Globe } from 'lucide-react';
import { getDisplay } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import { useLanguage } from '../context/LanguageContext';

// Mask patient names for public hospital TV display privacy (HIPAA / Patient Data Protection)
function maskPatientName(name) {
  if (!name || typeof name !== 'string') return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : `${parts[0]}*`;
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}***`;
}

export function DisplayBoard() {
  const [displayData, setDisplayData] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [audioSupported, setAudioSupported] = useState(true);

  const { lang, setLang, t } = useLanguage();

  // Refs for tracking announcement state and preventing repeated/stale speech
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;

  const langRef = useRef(lang);
  langRef.current = lang;

  const initialLoadRef = useRef(true);
  const knownServingTokensRef = useRef(new Set());
  const announcementQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const speechTimeoutRef = useRef(null);

  // Check speech synthesis availability on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setAudioSupported(false);
      return;
    }

    // Populate voices (Chrome loads voices asynchronously)
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);

  // Live Clock (1 second interval)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Voice lookup helper for Indian locales
  const getVoiceForLanguage = useCallback((currentLang) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    let targetLocale = 'en-IN';
    if (currentLang === 'hi') targetLocale = 'hi-IN';
    if (currentLang === 'mr') targetLocale = 'mr-IN';

    // 1. Exact locale match
    let match = voices.find(
      (v) => v.lang === targetLocale || v.lang.replace('_', '-') === targetLocale
    );
    if (match) return match;

    // 2. For Marathi, if mr-IN is missing in OS, fall back to hi-IN (Devanagari phonetics)
    if (currentLang === 'mr') {
      match = voices.find((v) => v.lang.startsWith('hi'));
      if (match) return match;
    }

    // 3. Fallback to general language code
    const prefix = currentLang === 'mr' ? 'hi' : currentLang;
    match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (match) return match;

    // 4. Default system voice
    return voices.find((v) => v.default) || voices[0] || null;
  }, []);

  // Build announcement phrasing in English, Hindi, or Marathi
  const buildAnnouncementText = useCallback((item, currentLang) => {
    const { tokenNumber, patientName, doctorName, room } = item;
    const maskedName = maskPatientName(patientName);

    if (currentLang === 'hi') {
      let msg = `टोकन नंबर ${tokenNumber}. `;
      if (maskedName) {
        msg += `मरीज ${maskedName}. `;
      }
      if (doctorName && room) {
        msg += `कृपया ${room} में ${doctorName} के पास जाएं।`;
      } else if (room) {
        msg += `कृपया ${room} में जाएं।`;
      } else if (doctorName) {
        msg += `कृपया ${doctorName} के परामर्श कक्ष में जाएं।`;
      } else {
        msg += `कृपया अपने परामर्श कक्ष में जाएं।`;
      }
      return msg;
    }

    if (currentLang === 'mr') {
      let msg = `टोकन क्रमांक ${tokenNumber}. `;
      if (maskedName) {
        msg += `रुग्ण ${maskedName}. `;
      }
      if (doctorName && room) {
        msg += `कृपया ${room} मध्ये ${doctorName} यांच्याकडे जावे.`;
      } else if (room) {
        msg += `कृपया ${room} मध्ये जावे.`;
      } else if (doctorName) {
        msg += `कृपया ${doctorName} यांच्या तपासणी कक्षात जावे.`;
      } else {
        msg += `कृपया आपल्या तपासणी कक्षात जावे.`;
      }
      return msg;
    }

    // Default: English
    let msg = `Token number ${tokenNumber}. `;
    if (maskedName) {
      msg += `Patient ${maskedName}. `;
    }
    if (doctorName && room) {
      msg += `Please proceed to ${doctorName} in ${room}.`;
    } else if (room) {
      msg += `Please proceed to ${room}.`;
    } else if (doctorName) {
      msg += `Please proceed to ${doctorName}.`;
    } else {
      msg += `Please proceed to your consultation room.`;
    }
    return msg;
  }, []);

  // Sequential speech queue processor
  const processQueue = useCallback(() => {
    if (!audioEnabledRef.current) return;
    if (isSpeakingRef.current) return;
    if (announcementQueueRef.current.length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const item = announcementQueueRef.current.shift();
    if (!item) return;

    isSpeakingRef.current = true;
    setActiveAnnouncement(item);

    try {
      window.speechSynthesis.cancel();

      const text = buildAnnouncementText(item, langRef.current);
      const utterance = new SpeechSynthesisUtterance(text);
      activeUtteranceRef.current = utterance; // Prevent garbage collection mid-speech

      utterance.rate = 0.9; // Slightly slower for clarity in hospital lobby
      utterance.pitch = 1.0;

      const voice = getVoiceForLanguage(langRef.current);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.lang =
        langRef.current === 'hi' ? 'hi-IN' : langRef.current === 'mr' ? 'mr-IN' : 'en-IN';

      const finishSpeech = () => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        activeUtteranceRef.current = null;
        isSpeakingRef.current = false;
        setTimeout(() => setActiveAnnouncement(null), 1500);

        // Pause 600ms between sequential token announcements
        setTimeout(() => {
          processQueue();
        }, 600);
      };

      utterance.onend = finishSpeech;
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error or interrupted:', e);
        finishSpeech();
      };

      // Safety timeout: reset if onend fails to fire in browser (10s max)
      speechTimeoutRef.current = setTimeout(() => {
        console.warn('Speech timeout reached, forcing queue advance');
        finishSpeech();
      }, 10000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Failed to speak announcement:', err);
      isSpeakingRef.current = false;
      setActiveAnnouncement(null);
    }
  }, [buildAnnouncementText, getVoiceForLanguage]);

  // Main Display Polling Fetcher
  const fetchDisplay = async () => {
    try {
      const res = await getDisplay();
      const departments = res.departments || [];
      setDisplayData(departments);

      // Collect all currently serving tokens across departments
      const currentServingList = [];
      departments.forEach((dept) => {
        if (dept.now_serving && dept.now_serving.length > 0) {
          dept.now_serving.forEach((srv) => {
            currentServingList.push({
              tokenNumber: srv.token_number,
              doctorName: srv.doctor_name,
              room: srv.room,
              patientName: srv.patient_name || null,
              departmentName: dept.department_name,
            });
          });
        }
      });

      // 1. Initial Load: Record existing tokens without announcing
      if (initialLoadRef.current) {
        currentServingList.forEach((srv) => {
          knownServingTokensRef.current.add(srv.tokenNumber);
        });
        initialLoadRef.current = false;
        return;
      }

      // 2. Subsequent 5s Polls: Detect newly called tokens
      const newTokens = [];
      currentServingList.forEach((srv) => {
        if (!knownServingTokensRef.current.has(srv.tokenNumber)) {
          knownServingTokensRef.current.add(srv.tokenNumber);
          newTokens.push(srv);
        }
      });

      // Memory cleanup: keep recently tracked tokens bounded
      if (knownServingTokensRef.current.size > 200) {
        const activeTokenNumbers = new Set(currentServingList.map((s) => s.tokenNumber));
        knownServingTokensRef.current.forEach((tok) => {
          if (!activeTokenNumbers.has(tok)) {
            knownServingTokensRef.current.delete(tok);
          }
        });
      }

      // 3. Queue announcements for newly called tokens if audio is active
      if (newTokens.length > 0 && audioEnabledRef.current) {
        newTokens.forEach((token) => {
          announcementQueueRef.current.push(token);
        });
        processQueue();
      }
    } catch (err) {
      console.error('Failed to fetch display data:', err);
    }
  };

  // Poll display every 5 seconds
  usePolling(fetchDisplay, 5000);

  // Toggle Audio Announcements & unlock browser speech synthesis with user gesture
  const toggleAudio = () => {
    if (!audioSupported) return;

    if (!audioEnabled) {
      setAudioEnabled(true);

      // Explicit user click gesture unlocks SpeechSynthesis in browser
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const unlockPhrases = {
            en: 'Voice announcements enabled',
            hi: 'आवाज घोषणाएं चालू कर दी गई हैं',
            mr: 'ध्वनी घोषणा सुरू करण्यात आल्या आहेत',
          };
          const unlockText = unlockPhrases[lang] || unlockPhrases.en;
          const unlockUtterance = new SpeechSynthesisUtterance(unlockText);
          unlockUtterance.rate = 1.0;
          unlockUtterance.volume = 0.6;
          const voice = getVoiceForLanguage(lang);
          if (voice) unlockUtterance.voice = voice;
          window.speechSynthesis.speak(unlockUtterance);
        } catch (e) {
          console.warn('Audio unlock utterance warning:', e);
        }
      }
    } else {
      setAudioEnabled(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      announcementQueueRef.current = [];
      isSpeakingRef.current = false;
      setActiveAnnouncement(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-between select-none">
      {/* TV Header */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        {/* Brand Title */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 flex-shrink-0">
            <Activity className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-teal-400 via-emerald-300 to-white bg-clip-text text-transparent">
              {t('displayBoard')}
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wide">
              Sanjeevan Multispecialty Hospital, Yavatmal &bull; Live OPD Queue Display
            </p>
          </div>
        </div>

        {/* Live Calling Alert Banner (shown when actively announcing) */}
        {activeAnnouncement && (
          <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl shadow-lg shadow-emerald-950/40 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-xs sm:text-sm font-extrabold text-emerald-300 font-mono">
              🔊 {t('nowCalling')}: {activeAnnouncement.tokenNumber}
              {activeAnnouncement.patientName && ` (${maskPatientName(activeAnnouncement.patientName)})`} &rarr;{' '}
              {activeAnnouncement.room}
            </span>
          </div>
        )}

        {/* Header Controls: Audio Toggle, Language Switcher, Live Clock */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-900/90 rounded-2xl border border-slate-800 p-1">
            <Globe className="w-4 h-4 text-slate-400 ml-2 mr-1" />
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                lang === 'en'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('hi')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                lang === 'hi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => setLang('mr')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                lang === 'mr'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              मराठी
            </button>
          </div>

          {/* Phase 5.1: Enable / Mute Audio Announcements Toggle */}
          {audioSupported ? (
            <button
              type="button"
              onClick={toggleAudio}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition cursor-pointer border ${
                audioEnabled
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30 shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={audioEnabled ? t('muteVoice') : t('enableVoice')}
            >
              {audioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>{t('voiceActive')}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>{t('voiceMuted')}</span>
                </>
              )}
            </button>
          ) : (
            <div
              className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400"
              title={t('speechUnsupported')}
            >
              <VolumeX className="w-4 h-4 text-slate-500" />
              <span>Audio N/A</span>
            </div>
          )}

          {/* Live Clock */}
          <div className="flex items-center space-x-4 bg-slate-900/80 px-4 sm:px-5 py-2 rounded-2xl border border-slate-800 shadow-inner">
            <div className="text-right">
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-300 tracking-wider">
                {currentTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {currentTime.toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Departments */}
      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 my-6 flex-1">
        {displayData.map((dept) => (
          <div
            key={dept.department_id}
            className="bg-slate-900/90 rounded-3xl border border-slate-800/90 shadow-2xl p-6 flex flex-col justify-between space-y-5"
          >
            {/* Dept Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {dept.department_name}
                </h2>
                <span className="text-[11px] text-slate-400 font-bold">
                  {dept.waiting_count} {t('statusWaiting')} &bull; ~{dept.est_wait_min}m{' '}
                  {dept.wait_time_range_min && dept.wait_time_range_min.length === 2 && dept.est_wait_min > 0
                    ? `(${dept.wait_time_range_min[0]}–${dept.wait_time_range_min[1]}m) `
                    : ''}
                  {t('estWait')}
                </span>
              </div>
              <span className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-black flex items-center justify-center text-sm">
                {dept.department_name.charAt(0)}
              </span>
            </div>

            {/* Now Serving Big Highlight */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>{t('nowServing')}</span>
              </span>

              {dept.now_serving && dept.now_serving.length > 0 ? (
                <div className="space-y-2">
                  {dept.now_serving.map((srv, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-300 tracking-tight">
                          {srv.token_number}
                        </div>
                        <div className="text-xs text-emerald-200/90 font-semibold mt-1">
                          {srv.doctor_name}
                          {srv.patient_name && (
                            <span className="text-emerald-400/90 font-medium ml-2">
                              &bull; {maskPatientName(srv.patient_name)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black uppercase text-slate-400 block tracking-wider">
                          {t('room')}
                        </span>
                        <span className="text-base font-extrabold text-white">
                          {srv.room}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-slate-400 text-sm font-semibold italic">
                  Cabin Available
                </div>
              )}
            </div>

            {/* Next Up Tokens */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Next In Line (Ready Near Room)
              </span>
              <div className="flex flex-wrap gap-2">
                {dept.next_up && dept.next_up.length > 0 ? (
                  dept.next_up.map((tokNum, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold shadow-xs ${
                        i === 0
                          ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {tokNum}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No waiting tokens</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Emergency Announcement Ticker */}
      <footer className="mt-4 p-3.5 bg-blue-950/60 rounded-2xl border border-blue-800/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-2">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase">
            Notice
          </span>
          <span>{t('proceedToCabin')}</span>
        </div>
        <div className="text-blue-300 font-semibold">
          Emergency Desk: Ground Floor (Room 001) &bull; Ambulance: 112
        </div>
      </footer>
    </div>
  );
}
