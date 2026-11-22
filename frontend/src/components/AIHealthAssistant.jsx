import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  PhoneCall,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  HelpCircle,
  Activity,
  User,
  Radio,
  Sliders,
  Calendar,
  Ticket,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { chat, triageSymptoms, resetConversation, createToken } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { VoiceWaveform } from './VoiceWaveform';
import { QRCodeCard } from './QRCodeCard';
import {
  createSpeechRecognizer,
  speakText,
  stopSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported
} from '../utils/speech';

export function AIHealthAssistant({ tokenId = null, onSelectDepartment = null, initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState('voice'); // 'voice' | 'chat'
  const [speechRate, setSpeechRate] = useState(0.9); // 0.8x for elderly clarity
  const [conversationId, setConversationId] = useState(() => {
    return localStorage.getItem('healpath_ai_conv_id') || null;
  });

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Namaste! I am the Sanjeevan Multispecialty Hospital AI Voice & Health Assistant. Speak or type in Marathi, Hindi, or English.',
      intent: 'general',
      urgency: 'ROUTINE',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: '🎫 Live Queue Status', action: 'check_wait' },
        { label: '👨‍⚕️ Available Doctors', action: 'view_doctors' },
        { label: '📅 Book Appointment', action: 'book_appointment' },
        { label: '🚨 Emergency Help', action: 'emergency' }
      ]
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedText, setLastFailedText] = useState(null);
  const [lastBotSpokenText, setLastBotSpokenText] = useState('');
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechError, setSpeechError] = useState(null);

  // Active registration & token creation draft
  const [registrationDraft, setRegistrationDraft] = useState(null);
  const [createdTokenResult, setCreatedTokenResult] = useState(null);
  const [isRegisteringToken, setIsRegisteringToken] = useState(false);

  const { lang, setLang, t } = useLanguage();
  const chatBottomRef = useRef(null);
  const recognizerRef = useRef(null);

  // Pre-populated quick prompts
  const quickVoicePrompts = [
    {
      label: 'माझा नंबर कधी येईल?',
      text: 'माझा नंबर कधी येईल आणि किती रुग्ण बाकी आहेत?',
      lang: 'mr'
    },
    {
      label: 'डॉक्टर उपलब्ध आहेत?',
      text: 'सध्या कोणते तज्ज्ञ डॉक्टर उपलब्ध आहेत?',
      lang: 'mr'
    },
    {
      label: 'अस्पताल का समय',
      text: 'संजीवन अस्पताल का ओपीडी समय क्या है?',
      lang: 'hi'
    },
    {
      label: 'New OPD Token',
      text: 'I want to register a new patient token',
      lang: 'en'
    }
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isLoading, interimText, registrationDraft, createdTokenResult]);

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('healpath_ai_conv_id', conversationId);
    }
  }, [conversationId]);

  // Clean up speech recognition & synthesis when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech();
      recognizerRef.current?.abort();
    };
  }, []);

  // Update speech recognizer when language changes
  useEffect(() => {
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      setIsListening(false);
    }
  }, [lang]);

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
      onStart: () => {
        setIsListening(true);
      },
      onInterim: (text) => {
        setInterimText(text);
      },
      onFinal: (finalText) => {
        setIsListening(false);
        setInterimText('');
        if (finalText && finalText.trim().length > 0) {
          handleSend(finalText.trim());
        }
      },
      onError: (friendlyMsg) => {
        setIsListening(false);
        setInterimText('');
        setSpeechError(friendlyMsg);
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
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsListening(false);
    setInterimText('');
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeak = (textToSpeak) => {
    if (!voiceEnabled || !isSpeechSynthesisSupported() || !textToSpeak) return;
    setIsSpeaking(true);
    speakText(textToSpeak, {
      lang,
      rate: speechRate,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const repeatLastResponse = () => {
    if (lastBotSpokenText) {
      handleSpeak(lastBotSpokenText);
    } else if (messages.length > 0) {
      const lastBot = [...messages].reverse().find(m => m.sender === 'bot');
      if (lastBot) {
        handleSpeak(lastBot.spoken_text || lastBot.text);
      }
    }
  };

  const handleSend = async (manualText = null) => {
    const textToSend = manualText || inputText;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: timeStr
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setInterimText('');
    setIsLoading(true);
    setLastFailedText(null);
    setSpeechError(null);

    // If user is confirming a pending registration draft:
    if (registrationDraft && registrationDraft.ready_to_confirm) {
      const lower = textToSend.toLowerCase();
      if (lower.includes('yes') || lower.includes('हो') || lower.includes('हाँ') || lower.includes('confirm') || lower.includes('बरोबर') || lower.includes('ठीक')) {
        await executeVoiceRegistration(registrationDraft);
        setIsLoading(false);
        return;
      }
    }

    try {
      const res = await chat(textToSend, lang, tokenId, conversationId);
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }

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

      // Check for structured drafts
      if (res.structured_data?.type === 'patient_registration_draft') {
        setRegistrationDraft(res.structured_data);
      } else {
        setRegistrationDraft(null);
      }

      // Voice output
      const toUtter = res.spoken_text || res.reply;
      setLastBotSpokenText(toUtter);
      if (voiceEnabled) {
        handleSpeak(toUtter);
      }
    } catch (err) {
      setLastFailedText(textToSend);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Unable to process query. Please retry or visit Sanjeevan Hospital reception desk.',
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
        symptoms: 'Registered via Multilingual AI Voice Assistant',
        source: 'walk_in'
      };

      const tokenRes = await createToken(payload);
      setCreatedTokenResult(tokenRes);
      setRegistrationDraft(null);

      const successReply = lang === 'mr'
        ? `अभिनंदन! आपला टोकन क्रमांक ${tokenRes.token_number} यशस्वीरीत्या तयार झाला आहे. विभाग: ${tokenRes.department_name}. अंदाजे प्रतीक्षा वेळ: ~${tokenRes.est_wait_min || 15} मिनिटे.`
        : lang === 'hi'
        ? `बधाई! आपका डिजिटल टोकन नंबर ${tokenRes.token_number} सफलतापूर्वक बन गया है। विभाग: ${tokenRes.department_name}। अनुमानित प्रतीक्षा समय: ~${tokenRes.est_wait_min || 15} मिनट।`
        : `Success! Digital token ${tokenRes.token_number} created for ${tokenRes.department_name}. Estimated wait: ~${tokenRes.est_wait_min || 15} mins.`;

      const botSuccessMsg = {
        id: `bot-token-${Date.now()}`,
        sender: 'bot',
        text: successReply,
        intent: 'token_status',
        urgency: 'ROUTINE',
        structured_data: { type: 'token_created', token: tokenRes },
        actions: [
          { label: '🎫 Track Token', action: 'track_token' },
          { label: '📺 Display Board', action: 'view_display' }
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botSuccessMsg]);
      setLastBotSpokenText(successReply);
      if (voiceEnabled) {
        handleSpeak(successReply);
      }
    } catch (err) {
      const failMsg = {
        id: `err-tok-${Date.now()}`,
        sender: 'bot',
        text: 'Failed to create digital token. Please ensure mobile number has 10 digits and try again at the counter.',
        isError: true,
        urgency: 'ROUTINE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, failMsg]);
    } finally {
      setIsRegisteringToken(false);
    }
  };

  const handleReset = async () => {
    stopSpeech();
    setIsSpeaking(false);
    stopListening();
    if (conversationId) {
      try {
        await resetConversation(conversationId);
      } catch (e) {
        console.warn('Reset error:', e);
      }
    }
    localStorage.removeItem('healpath_ai_conv_id');
    setConversationId(null);
    setRegistrationDraft(null);
    setCreatedTokenResult(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: 'Conversation reset. How can I assist you with your hospital visit or token today?',
        intent: 'general',
        urgency: 'ROUTINE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: '🎫 Live Queue Status', action: 'check_wait' },
          { label: '👨‍⚕️ Available Doctors', action: 'view_doctors' },
          { label: '📅 Book Appointment', action: 'book_appointment' }
        ]
      }
    ]);
  };

  const handleActionClick = (action) => {
    if (action === 'check_wait') {
      handleSend('What is the current queue status and wait time?');
    } else if (action === 'book_appointment') {
      window.location.hash = '#/book-appointment';
      setIsOpen(false);
    } else if (action === 'view_doctors') {
      handleSend('Which doctors are currently available on duty?');
    } else if (action === 'track_token') {
      window.location.hash = '#/patient/lookup';
      setIsOpen(false);
    } else if (action === 'view_display') {
      window.location.hash = '#/display';
      setIsOpen(false);
    } else if (action === 'voice_register' && registrationDraft) {
      executeVoiceRegistration(registrationDraft);
    } else if (action === 'call_emergency') {
      window.open('tel:+919552625262', '_self');
    } else if (action === 'call_112') {
      window.open('tel:112', '_self');
    } else if (action === 'open_map') {
      window.open('https://maps.google.com/?q=Sanjeevan+Hospital+Yavatmal', '_blank');
    }
  };

  const renderUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'EMERGENCY':
        return (
          <div className="flex items-center space-x-1 px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full animate-pulse shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CRITICAL EMERGENCY</span>
          </div>
        );
      case 'URGENT':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
            <AlertTriangle className="w-3 h-3" />
            <span>Urgent</span>
          </div>
        );
      case 'MODERATE':
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-cyan-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
            <Clock className="w-3 h-3" />
            <span>Moderate</span>
          </div>
        );
      case 'ROUTINE':
      default:
        return (
          <div className="flex items-center space-x-1 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            <span>OPD Guidance</span>
          </div>
        );
    }
  };

  const currentWaveState = isListening ? 'listening' : isSpeaking ? 'speaking' : isLoading ? 'processing' : 'idle';

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
          aria-label="Open AI Health Assistant"
        >
          <div className="relative">
            <Mic className="w-5 h-5 text-cyan-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-sm font-bold tracking-tight">
            {lang === 'mr' ? 'आवाज सहाय्यक' : lang === 'hi' ? 'आवाज़ सहायक' : 'Voice Assistant'}
          </span>
          <span className="text-[10px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full">
            AI 2.5
          </span>
        </button>
      )}

      {/* Floating Chat & Voice Modal */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[96vw] sm:w-[480px] h-[640px] max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-inner">
                <Mic className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-extrabold leading-tight tracking-tight">
                    {t('voiceAssistantTitle')}
                  </h3>
                  <span className="text-[9px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.5 rounded-full font-mono font-semibold">
                    v2.5 Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 flex items-center space-x-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                  <span>Sanjeevan Hospital Yavatmal • 445001</span>
                </p>
              </div>
            </div>

            {/* Header Controls: Lang, Mode, Mute, Reset, Close */}
            <div className="flex items-center space-x-1">
              {/* Language Selector */}
              <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20">
                <button
                  type="button"
                  onClick={() => setLang('mr')}
                  className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${lang === 'mr' ? 'bg-cyan-500 text-slate-900' : 'text-white/80 hover:text-white'}`}
                  title="मराठी"
                >
                  मराठी
                </button>
                <button
                  type="button"
                  onClick={() => setLang('hi')}
                  className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${lang === 'hi' ? 'bg-cyan-500 text-slate-900' : 'text-white/80 hover:text-white'}`}
                  title="हिंदी"
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${lang === 'en' ? 'bg-cyan-500 text-slate-900' : 'text-white/80 hover:text-white'}`}
                  title="English"
                >
                  EN
                </button>
              </div>

              {/* Mute/Unmute */}
              <button
                type="button"
                onClick={() => {
                  if (voiceEnabled) stopSpeech();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={voiceEnabled ? 'Mute Speech' : 'Enable Speech'}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Repeat Response */}
              <button
                type="button"
                onClick={repeatLastResponse}
                title="Repeat Response"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  stopListening();
                  setIsOpen(false);
                }}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-rose-500/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader: Voice Waveform & Speech Speed Controls */}
          <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <VoiceWaveform state={currentWaveState} barCount={12} className="h-8 py-0 px-0" />
              <div className="text-[11px]">
                {isListening ? (
                  <span className="text-cyan-300 font-bold animate-pulse">{t('listeningNow')}</span>
                ) : isSpeaking ? (
                  <span className="text-emerald-300 font-bold">{t('speakingNow')}</span>
                ) : isLoading ? (
                  <span className="text-amber-300 font-bold">{t('processingVoice')}</span>
                ) : (
                  <span className="text-slate-400">{t('tapToSpeak')}</span>
                )}
              </div>
            </div>

            {/* Speech Rate Controls for Elderly Clarity */}
            <div className="flex items-center space-x-1 text-[10px] text-slate-400">
              <Sliders className="w-3 h-3 text-slate-400" />
              <button
                type="button"
                onClick={() => setSpeechRate(0.8)}
                className={`px-1.5 py-0.5 rounded font-semibold ${speechRate === 0.8 ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Elderly Slow Pace"
              >
                0.8x
              </button>
              <button
                type="button"
                onClick={() => setSpeechRate(1.0)}
                className={`px-1.5 py-0.5 rounded font-semibold ${speechRate === 1.0 ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Normal Pace"
              >
                1.0x
              </button>
            </div>
          </div>

          {/* Speech Error Warning Banner */}
          {speechError && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px]">{speechError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpeechError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Voice Question Strip */}
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-0.5">
              {lang === 'mr' ? 'उदा.' : lang === 'hi' ? 'उदा.' : 'Ask:'}
            </span>
            {quickVoicePrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(qp.text)}
                className="shrink-0 flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-full font-medium transition text-[11px]"
              >
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Conversation Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 text-xs sm:text-sm">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              const isEmergency = m.urgency === 'EMERGENCY' || m.intent === 'emergency';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed shadow-xs transition-all ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-br-xs'
                        : isEmergency
                        ? 'bg-rose-50 text-rose-950 border-2 border-rose-400 rounded-bl-xs'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                    }`}
                  >
                    {/* Bot Header with Urgency indicator */}
                    {!isUser && (
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-bold text-[11px] text-slate-700">HealPath Voice AI</span>
                          {m.is_offline_fallback && (
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono">
                              Offline Rules
                            </span>
                          )}
                        </div>
                        {renderUrgencyBadge(m.urgency)}
                      </div>
                    )}

                    {/* Emergency Alert Banner */}
                    {isEmergency && !isUser && (
                      <div className="mb-2 p-2.5 bg-rose-600 text-white rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5 font-black text-xs uppercase tracking-wide">
                            <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                            <span>{t('emergencyAlert')}</span>
                          </div>
                          <a
                            href="tel:+919552625262"
                            className="px-2.5 py-1 bg-white text-rose-700 font-extrabold rounded-lg text-xs hover:bg-rose-50 flex items-center space-x-1 shadow-sm"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>+91 95526 25262</span>
                          </a>
                        </div>
                        <p className="text-[11px] leading-tight text-rose-100">
                          Sanjeevan Hospital Casualty & Emergency ICU (Ground Floor, Mahadev Mandir Road, Yavatmal) is open 24/7.
                        </p>
                      </div>
                    )}

                    {/* Message Text */}
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Interactive Structured Card: Token Status & Predictions */}
                    {m.structured_data?.type === 'token_status' && (
                      <div className="mt-2.5 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-1.5 text-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-blue-900">
                            Token: {m.structured_data.token_number}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                            {m.structured_data.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div>
                            <span className="text-slate-500 block">Department:</span>
                            <span className="font-bold">{m.structured_data.department}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Doctor Cabin:</span>
                            <span className="font-bold">{m.structured_data.room}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Patients Ahead:</span>
                            <span className="font-bold text-amber-700">{m.structured_data.people_ahead}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Est. Wait:</span>
                            <span className="font-bold text-emerald-700">
                              ~{m.structured_data.est_wait_min}m ({m.structured_data.wait_time_range_min?.[0]}–{m.structured_data.wait_time_range_min?.[1]}m)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Interactive Voice Patient Registration Confirmation Card */}
                    {m.structured_data?.type === 'patient_registration_draft' && m.structured_data.ready_to_confirm && (
                      <div className="mt-2.5 p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2 text-slate-800">
                        <div className="flex items-center space-x-1.5 text-emerald-800 font-extrabold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{t('confirmVoicePrompt')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-emerald-200">
                          <div>
                            <span className="text-slate-500 block text-[10px]">{t('patientNameVoice')}</span>
                            <span className="font-bold">{m.structured_data.name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">{t('patientAgeVoice')}</span>
                            <span className="font-bold">{m.structured_data.age} yrs ({m.structured_data.priority})</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">{t('patientDeptVoice')}</span>
                            <span className="font-bold">{m.structured_data.department_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">{t('patientPhoneVoice')}</span>
                            <span className="font-bold">{m.structured_data.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            type="button"
                            disabled={isRegisteringToken}
                            onClick={() => executeVoiceRegistration(m.structured_data)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-sm flex items-center justify-center space-x-1 transition"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>{isRegisteringToken ? 'Generating...' : t('confirmVoiceToken')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegistrationDraft(null)}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition"
                          >
                            {t('cancelVoiceToken')}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interactive Created Token Card */}
                    {m.structured_data?.type === 'token_created' && m.structured_data.token && (
                      <div className="mt-2.5">
                        <QRCodeCard token={m.structured_data.token} />
                      </div>
                    )}

                    {/* Action Chips */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                        {m.actions.map((act, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleActionClick(act.action)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-full transition active:scale-95 flex items-center space-x-1"
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Timestamp & Replay Button */}
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[9px] text-slate-400">
                      <span>{m.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleSpeak(m.spoken_text || m.text)}
                          title="Listen again"
                          className="flex items-center space-x-0.5 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{t('repeatResponse')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Interim live speech transcription preview */}
            {interimText && (
              <div className="flex flex-col items-end">
                <div className="p-3 rounded-2xl bg-blue-100 text-blue-900 border border-blue-300 rounded-br-xs max-w-[90%] text-xs italic animate-pulse">
                  <span className="text-[10px] block font-bold text-blue-600 not-italic uppercase mb-0.5">
                    Live Hearing:
                  </span>
                  "{interimText}..."
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-500 text-xs p-2.5 bg-white rounded-xl border border-slate-200 w-fit">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-200" />
                <span className="text-[11px] font-medium text-slate-600">
                  Checking live hospital roster & queues...
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* PRIMARY VOICE INTERFACE BAR (Phase 7.1 Large Microphone >= 64px) */}
          <div className="p-3 bg-gradient-to-b from-slate-900 to-slate-950 text-white border-t border-slate-800 flex flex-col items-center space-y-2">
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[11px] text-slate-400">
                {isListening ? 'Tap mic to send' : isSpeaking ? 'Playing answer' : 'Tap mic to speak'}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                title="Clear conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('clearConversation')}</span>
              </button>
            </div>

            {/* Large 64px+ Microphone Button with Animated Ripple */}
            <div className="relative flex items-center justify-center my-1">
              {isListening && (
                <>
                  <span className="absolute w-20 h-20 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
                  <span className="absolute w-24 h-24 rounded-full bg-blue-500/20 animate-pulse pointer-events-none" />
                </>
              )}
              {isSpeaking && (
                <span className="absolute w-20 h-20 rounded-full bg-emerald-400/30 animate-pulse pointer-events-none" />
              )}
              <button
                type="button"
                onClick={toggleMic}
                aria-label={isListening ? 'Stop listening' : 'Start voice assistant'}
                className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 z-10 ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-300'
                    : isSpeaking
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-300'
                    : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white ring-4 ring-cyan-500/20 hover:scale-105'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
                ) : (
                  <Mic className="w-7 h-7 sm:w-8 sm:h-8" />
                )}
              </button>
            </div>

            {/* Text Fallback Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="w-full flex items-center space-x-2 pt-1"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Or type your symptoms / question here..."
                className="flex-1 text-xs bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-900 font-bold text-xs shadow-xs transition flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default AIHealthAssistant;
