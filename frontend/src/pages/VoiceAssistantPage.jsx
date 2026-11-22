import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  PhoneCall,
  Clock,
  MapPin,
  Stethoscope,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  Send,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Calendar,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { chat, createToken, resetConversation } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { QRCodeCard } from '../components/QRCodeCard';
import {
  createSpeechRecognizer,
  speakText,
  stopSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported
} from '../utils/speech';

export function VoiceAssistantPage() {
  const { lang, setLang, t } = useLanguage();
  const [speechRate, setSpeechRate] = useState(0.85); // Elder-friendly pace
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechError, setSpeechError] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => localStorage.getItem('healpath_voice_page_cid') || null);
  
  // Registration and active token states
  const [registrationDraft, setRegistrationDraft] = useState(null);
  const [createdTokenResult, setCreatedTokenResult] = useState(null);
  const [isRegisteringToken, setIsRegisteringToken] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: lang === 'mr'
        ? 'नमस्कार! मी संजीवन रुग्णालयाचा आवाज सहाय्यक आहे. आपण मराठी, हिंदी किंवा इंग्रजीत बोलू शकता. खालील माईक बटण दाबून बोला.'
        : lang === 'hi'
        ? 'नमस्ते! मैं संजीवन अस्पताल का आवाज़ सहायक हूँ। आप हिंदी, मराठी या अंग्रेजी में बोल सकते हैं। नीचे दिया गया माइक बटन दबाकर बोलें।'
        : 'Welcome! I am the Sanjeevan Hospital Voice Assistant. You can speak or type in Marathi, Hindi, or English. Tap the microphone below to speak.',
      intent: 'general',
      urgency: 'ROUTINE',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const recognizerRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText, isLoading, registrationDraft, createdTokenResult]);

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('healpath_voice_page_cid', conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      stopSpeech();
      recognizerRef.current?.abort();
    };
  }, []);

  const handleSpeak = (text) => {
    if (!voiceEnabled || !isSpeechSynthesisSupported() || !text) return;
    setIsSpeaking(true);
    speakText(text, {
      lang,
      rate: speechRate,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const startListening = () => {
    setSpeechError(null);
    setInterimText('');
    stopSpeech();
    setIsSpeaking(false);

    if (!isSpeechRecognitionSupported()) {
      setSpeechError(t('speechRecUnsupported') || 'Voice recognition not supported in this browser. Please use Chrome/Edge or type below.');
      return;
    }

    const recognizer = createSpeechRecognizer({
      lang,
      onStart: () => setIsListening(true),
      onInterim: (text) => setInterimText(text),
      onFinal: (finalText) => {
        setIsListening(false);
        setInterimText('');
        if (finalText && finalText.trim()) {
          handleSend(finalText.trim());
        }
      },
      onError: (msg) => {
        setIsListening(false);
        setInterimText('');
        setSpeechError(msg);
      },
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
      }
    });

    recognizerRef.current = recognizer;
    recognizer.start();
  };

  const stopListening = () => {
    recognizerRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  };

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const handleSend = async (manualText = null) => {
    const textToSend = manualText || inputText;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setInterimText('');
    setIsLoading(true);
    setSpeechError(null);

    // Confirmation intercept for voice registration
    if (registrationDraft && registrationDraft.ready_to_confirm) {
      const lower = textToSend.toLowerCase();
      if (lower.includes('yes') || lower.includes('हो') || lower.includes('हाँ') || lower.includes('confirm') || lower.includes('ठीक')) {
        await executeVoiceRegistration(registrationDraft);
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await chat(textToSend, lang, null, conversationId);
      if (res.conversation_id) setConversationId(res.conversation_id);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.reply,
        intent: res.intent,
        urgency: res.urgency || (res.intent === 'emergency' ? 'EMERGENCY' : 'ROUTINE'),
        actions: res.suggested_actions || [],
        structured_data: res.structured_data || null,
        spoken_text: res.spoken_text || res.reply,
        is_offline_fallback: res.is_offline_fallback || false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);

      if (res.structured_data?.type === 'patient_registration_draft') {
        setRegistrationDraft(res.structured_data);
      } else {
        setRegistrationDraft(null);
      }

      const toUtter = res.spoken_text || res.reply;
      if (voiceEnabled) {
        handleSpeak(toUtter);
      }
    } catch {
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Unable to process query. Please retry or contact the Sanjeevan Hospital reception desk.',
        isError: true,
        urgency: 'ROUTINE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeVoiceRegistration = async (draft) => {
    if (!draft || !draft.name || !draft.phone) return;
    setIsRegisteringToken(true);
    try {
      const payload = {
        name: draft.name,
        age: draft.age || 30,
        gender: draft.gender || 'other',
        phone: draft.phone,
        department_id: draft.department_id || 1,
        priority: draft.priority || 'normal',
        symptoms: 'Registered via Voice Assistant Page',
        source: 'walk_in'
      };

      const tokenRes = await createToken(payload);
      setCreatedTokenResult(tokenRes);
      setRegistrationDraft(null);

      const successReply = lang === 'mr'
        ? `आपला टोकन क्रमांक ${tokenRes.token_number} यशस्वीरीत्या तयार झाला आहे. विभाग: ${tokenRes.department_name}. अंदाजे प्रतीक्षा वेळ: ~${tokenRes.est_wait_min || 15} मिनिटे.`
        : lang === 'hi'
        ? `आपका टोकन नंबर ${tokenRes.token_number} सफलतापूर्वक बन गया है। विभाग: ${tokenRes.department_name}। अनुमानित प्रतीक्षा समय: ~${tokenRes.est_wait_min || 15} मिनट।`
        : `Digital token ${tokenRes.token_number} generated for ${tokenRes.department_name}. Estimated wait time: ~${tokenRes.est_wait_min || 15} mins.`;

      const botSuccessMsg = {
        id: `bot-tok-${Date.now()}`,
        sender: 'bot',
        text: successReply,
        intent: 'token_status',
        urgency: 'ROUTINE',
        structured_data: { type: 'token_created', token: tokenRes },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botSuccessMsg]);
      if (voiceEnabled) {
        handleSpeak(successReply);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-tok-${Date.now()}`,
          sender: 'bot',
          text: 'Registration failed. Please verify phone number has 10 digits.',
          isError: true,
          urgency: 'ROUTINE',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsRegisteringToken(false);
    }
  };

  const handleReset = async () => {
    stopSpeech();
    stopListening();
    if (conversationId) {
      try {
        await resetConversation(conversationId);
      } catch {}
    }
    localStorage.removeItem('healpath_voice_page_cid');
    setConversationId(null);
    setRegistrationDraft(null);
    setCreatedTokenResult(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: 'Conversation reset. How can I assist you with your health query or hospital visit today?',
        intent: 'general',
        urgency: 'ROUTINE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickActionCards = [
    {
      title: lang === 'mr' ? 'माझा नंबर कधी येईल?' : lang === 'hi' ? 'मेरा नंबर कब आएगा?' : 'When is my turn?',
      subtitle: lang === 'mr' ? 'थेट रांग स्थिती व वेळ' : lang === 'hi' ? 'लाइव कतार स्थिति' : 'Track live queue wait',
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      query: 'What is the current queue status and wait time?'
    },
    {
      title: lang === 'mr' ? 'कोणते डॉक्टर उपस्थित आहेत?' : lang === 'hi' ? 'कौन से डॉक्टर उपलब्ध हैं?' : 'Available Doctors',
      subtitle: lang === 'mr' ? 'ड्युटी रोस्टर व रूम' : lang === 'hi' ? 'ड्यूटी रोस्टर' : 'Check on-duty specialists',
      icon: <Stethoscope className="w-5 h-5 text-emerald-600" />,
      query: 'Which doctors are currently available on duty?'
    },
    {
      title: lang === 'mr' ? 'नवीन टोकन काढा' : lang === 'hi' ? 'नया टोकन बनाएं' : 'New OPD Token',
      subtitle: lang === 'mr' ? 'आवाजाने थेट नोंदणी' : lang === 'hi' ? 'आवाज़ द्वारा पंजीकरण' : 'Voice token registration',
      icon: <Ticket className="w-5 h-5 text-indigo-600" />,
      query: 'I want to register a new patient token'
    },
    {
      title: lang === 'mr' ? 'रुग्णालय पत्ता व वेळ' : lang === 'hi' ? 'अस्पताल का पता व समय' : 'Hospital Location',
      subtitle: lang === 'mr' ? 'यवतमाळ ४४५००१' : lang === 'hi' ? 'यवतमाल ४४५००१' : 'Yavatmal 445001',
      icon: <MapPin className="w-5 h-5 text-amber-600" />,
      query: 'Where is Sanjeevan hospital located and what are the timings?'
    }
  ];

  const waveState = isListening ? 'listening' : isSpeaking ? 'speaking' : isLoading ? 'processing' : 'idle';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between pb-8">
      {/* Top Header Bar */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                  {t('voiceAssistantTitle')}
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Vidarbha AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
              </p>
            </div>
          </div>

          {/* Language Switcher & Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setLang('mr')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${lang === 'mr' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${lang === 'hi' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${lang === 'en' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (voiceEnabled) stopSpeech();
                setVoiceEnabled(!voiceEnabled);
              }}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition"
              title={voiceEnabled ? 'Mute' : 'Unmute'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 hover:text-white transition"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Interactive Body */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 flex-1 flex flex-col justify-between py-6 space-y-6">
        {/* Quick Topic Cards for Quick Tap */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActionCards.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(c.query)}
              className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 rounded-2xl text-left transition transform hover:-translate-y-0.5 group shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                {c.icon}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                {c.title}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {c.subtitle}
              </p>
            </button>
          ))}
        </section>

        {/* Live Conversation Display Panel */}
        <section className="flex-1 min-h-[300px] max-h-[460px] overflow-y-auto bg-slate-950/70 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const isEmergency = m.urgency === 'EMERGENCY' || m.intent === 'emergency';

            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl max-w-[88%] leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : isEmergency
                      ? 'bg-rose-950 text-rose-100 border-2 border-rose-500 rounded-bl-xs'
                      : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-xs'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-700 text-xs">
                      <span className="font-bold text-cyan-300">Sanjeevan Voice AI</span>
                      {isEmergency && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-full animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                  )}

                  {isEmergency && !isUser && (
                    <div className="mb-2 p-3 bg-rose-600 text-white rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                        <span>Immediate Medical Care Required</span>
                      </div>
                      <a
                        href="tel:+919552625262"
                        className="px-3 py-1 bg-white text-rose-700 font-extrabold rounded-lg text-xs hover:bg-rose-50 shadow-sm"
                      >
                        +91 95526 25262
                      </a>
                    </div>
                  )}

                  <p className="text-sm sm:text-base whitespace-pre-wrap">{m.text}</p>

                  {/* Structured Token Confirmation Card */}
                  {m.structured_data?.type === 'patient_registration_draft' && m.structured_data.ready_to_confirm && (
                    <div className="mt-3 p-4 bg-emerald-950 border-2 border-emerald-400 rounded-2xl space-y-3 text-white">
                      <div className="flex items-center space-x-2 font-extrabold text-sm text-emerald-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>{t('confirmVoicePrompt')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900 p-3 rounded-xl border border-emerald-500/30">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Name</span>
                          <span className="font-bold text-sm text-white">{m.structured_data.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Age</span>
                          <span className="font-bold text-sm text-white">{m.structured_data.age} ({m.structured_data.priority})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Department</span>
                          <span className="font-bold text-sm text-white">{m.structured_data.department_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Phone</span>
                          <span className="font-bold text-sm text-white">{m.structured_data.phone}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          disabled={isRegisteringToken}
                          onClick={() => executeVoiceRegistration(m.structured_data)}
                          className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm shadow-lg flex items-center justify-center space-x-2 transition"
                        >
                          <Ticket className="w-4 h-4" />
                          <span>{isRegisteringToken ? 'Generating...' : t('confirmVoiceToken')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegistrationDraft(null)}
                          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                        >
                          {t('cancelVoiceToken')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QR Card after registration */}
                  {m.structured_data?.type === 'token_created' && m.structured_data.token && (
                    <div className="mt-3 bg-white text-slate-900 p-4 rounded-2xl shadow-xl">
                      <QRCodeCard token={m.structured_data.token} />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700 text-[10px] text-slate-400">
                    <span>{m.timestamp}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleSpeak(m.spoken_text || m.text)}
                        className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{t('repeatResponse')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {interimText && (
            <div className="flex flex-col items-end">
              <div className="p-3 bg-cyan-950 border border-cyan-400 text-cyan-200 rounded-2xl text-sm italic animate-pulse">
                "{interimText}..."
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center space-x-2 p-3 bg-slate-800 rounded-2xl border border-slate-700 w-fit">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-bounce" />
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce delay-100" />
              <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-200" />
              <span className="text-xs font-semibold text-slate-300">
                Checking live hospital records & doctor availability...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        {/* PRIMARY MICROPHONE & WAVEFORM SECTION (Phase 7.1) */}
        <section className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 flex flex-col items-center space-y-4 shadow-2xl">
          {/* Animated Waveform Visualizer */}
          <VoiceWaveform state={waveState} barCount={24} className="h-12 w-full max-w-md" />

          {/* Status Label */}
          <div className="text-center">
            {isListening ? (
              <p className="text-cyan-300 font-extrabold text-base sm:text-lg animate-pulse">
                {t('listeningNow')}
              </p>
            ) : isSpeaking ? (
              <p className="text-emerald-300 font-extrabold text-base sm:text-lg">
                {t('speakingNow')}
              </p>
            ) : (
              <p className="text-slate-300 text-xs sm:text-sm">
                {t('tapToSpeak')} ({lang === 'mr' ? 'मराठी' : lang === 'hi' ? 'हिंदी' : 'English'})
              </p>
            )}
          </div>

          {/* Giant Microphone Button (Minimum 64px+, Styled at 80px) */}
          <div className="relative flex items-center justify-center my-2">
            {isListening && (
              <>
                <span className="absolute w-28 h-28 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
                <span className="absolute w-36 h-36 rounded-full bg-blue-500/20 animate-pulse pointer-events-none" />
              </>
            )}
            {isSpeaking && (
              <span className="absolute w-28 h-28 rounded-full bg-emerald-400/30 animate-pulse pointer-events-none" />
            )}

            <button
              type="button"
              onClick={toggleMic}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 z-10 ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white ring-8 ring-rose-400/30'
                  : isSpeaking
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white ring-8 ring-emerald-400/30'
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white ring-8 ring-cyan-500/20 hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff className="w-10 h-10 animate-pulse" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>
          </div>

          {/* Fallback Text Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="w-full max-w-xl flex items-center space-x-2 pt-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Or type your question in Marathi, Hindi, or English..."
              className="flex-1 bg-slate-900 text-white placeholder-slate-500 border border-slate-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-sm rounded-2xl shadow-lg transition flex items-center space-x-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>

          {/* Healthcare Disclaimer */}
          <p className="text-[11px] text-slate-500 text-center max-w-lg leading-tight">
            Guidance and hospital navigation tool only; not a substitute for clinical physician consultation. In acute emergency, dial 112 or visit Sanjeevan ER (Ground Floor).
          </p>
        </section>
      </main>
    </div>
  );
}

export default VoiceAssistantPage;
