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
  Activity
} from 'lucide-react';
import { chat, triageSymptoms, resetConversation } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export function AIHealthAssistant({ tokenId = null, onSelectDepartment = null, initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [conversationId, setConversationId] = useState(() => {
    return localStorage.getItem('healpath_ai_conv_id') || null;
  });
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am the Sanjeevan Multispecialty Hospital AI Health & Navigation Assistant. How can I help you today?',
      intent: 'general',
      urgency: 'ROUTINE',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: '💡 Symptom Triage', action: 'quick_triage' },
        { label: '🎫 Check Queue Wait', action: 'check_wait' },
        { label: '📅 Book Appointment', action: 'book_appointment' },
        { label: '🚨 Emergency Help', action: 'emergency' }
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedText, setLastFailedText] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const chatBottomRef = useRef(null);

  // Pre-populated quick prompts
  const quickPrompts = [
    {
      label: 'Chest Tightness',
      text: 'I have severe chest tightness and palpitations radiating to my left arm.',
      icon: '❤️'
    },
    {
      label: 'Knee Pain',
      text: 'Severe pain and swelling in right knee joint after a twist.',
      icon: '🦵'
    },
    {
      label: 'Child Fever',
      text: 'My 4-year-old child has high fever, vomiting, and cough for 2 days.',
      icon: '👶'
    },
    {
      label: 'Ear & Throat',
      text: 'Sharp earache with difficulty swallowing and throat irritation.',
      icon: '👂'
    }
  ];

  // Speech Recognition setup
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('healpath_ai_conv_id', conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSend(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [lang]);

  const toggleMic = () => {
    if (!SpeechRecognition) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
          recognitionRef.current.start();
          setIsListening(true);
        }
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (manualText = null) => {
    const textToSend = manualText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: timeStr
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setLastFailedText(null);

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
        is_offline_fallback: res.is_offline_fallback || false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(res.reply);
    } catch (err) {
      setLastFailedText(textToSend);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Unable to connect to AI Health Assistant right now. You can retry or consult the Sanjeevan Hospital reception desk.',
        isError: true,
        urgency: 'ROUTINE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (conversationId) {
      try {
        await resetConversation(conversationId);
      } catch (e) {
        console.warn('Reset error:', e);
      }
    }
    localStorage.removeItem('healpath_ai_conv_id');
    setConversationId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: 'Conversation reset. How can I assist you with your health query or hospital visit today?',
        intent: 'general',
        urgency: 'ROUTINE',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: '💡 Symptom Triage', action: 'quick_triage' },
          { label: '🎫 Check Queue Wait', action: 'check_wait' },
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
      window.location.hash = '#/doctors-info';
      setIsOpen(false);
    } else if (action === 'track_token') {
      window.location.hash = '#/patient/lookup';
      setIsOpen(false);
    } else if (action === 'quick_triage') {
      handleSend('I need help assessing my symptoms and selecting the right department.');
    } else if (action === 'goto_emergency' || action === 'emergency') {
      handleSend('EMERGENCY: Patient requires immediate urgent medical evaluation.');
    } else if (action === 'call_112') {
      window.open('tel:112', '_self');
    }
  };

  const renderUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'EMERGENCY':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider rounded-md animate-pulse shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CRITICAL EMERGENCY</span>
          </div>
        );
      case 'URGENT':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-md">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Urgent (Priority OPD)</span>
          </div>
        );
      case 'MODERATE':
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-cyan-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-md">
            <Clock className="w-3.5 h-3.5" />
            <span>Moderate (Consult Today)</span>
          </div>
        );
      case 'ROUTINE':
      default:
        return (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Routine OPD</span>
          </div>
        );
    }
  };

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
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:inline">
            AI Health Assistant
          </span>
          <span className="text-[10px] bg-white/20 text-white font-medium px-1.5 py-0.5 rounded-full hidden md:inline">
            Gemini 2.5
          </span>
        </button>
      )}

      {/* Floating Chat / Drawer Modal */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[440px] h-[600px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold leading-tight tracking-tight">AI Health Assistant</h3>
                  <span className="text-[9px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.5 rounded-full font-mono font-semibold">
                    v2.5 Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 flex items-center space-x-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                  <span>Sanjeevan Hospital Yavatmal</span>
                </p>
              </div>
            </div>

            {/* Header Controls: Lang, Voice, Reset, Close */}
            <div className="flex items-center space-x-1">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs rounded-md px-1.5 py-1 border border-white/20 focus:outline-none transition cursor-pointer"
                title="Select Language"
              >
                <option value="en" className="text-slate-900">EN</option>
                <option value="hi" className="text-slate-900">हिंदी</option>
                <option value="mr" className="text-slate-900">मराठी</option>
              </select>

              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? 'Mute Speech' : 'Enable Speech'}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>

              <button
                type="button"
                onClick={handleReset}
                title="Reset Conversation"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-rose-500/20 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Symptom Prompts Header Strip */}
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Quick:
            </span>
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(qp.text)}
                className="shrink-0 flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-full font-medium transition text-[11px]"
              >
                <span>{qp.icon}</span>
                <span>{qp.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Body */}
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
                    className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed shadow-xs transition-all ${
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
                          <span className="font-bold text-[11px] text-slate-700">HealPath AI</span>
                          {m.is_offline_fallback && (
                            <span className="text-[9px] bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono">
                              Offline Mode
                            </span>
                          )}
                        </div>
                        {renderUrgencyBadge(m.urgency)}
                      </div>
                    )}

                    {/* Emergency Alert Banner */}
                    {isEmergency && !isUser && (
                      <div className="mb-2 p-2 bg-rose-600 text-white rounded-lg flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Immediate Medical Attention Required</span>
                        </div>
                        <a
                          href="tel:+919552625262"
                          className="px-2 py-1 bg-white text-rose-700 font-bold rounded text-[10px] hover:bg-rose-50 flex items-center space-x-1"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call Hotline</span>
                        </a>
                      </div>
                    )}

                    {/* Message Text */}
                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Retry on Error */}
                    {m.isError && lastFailedText && (
                      <div className="mt-2 pt-2 border-t border-rose-200">
                        <button
                          type="button"
                          onClick={() => handleSend(lastFailedText)}
                          className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs hover:bg-rose-700 flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry Question</span>
                        </button>
                      </div>
                    )}

                    {/* Suggested Action Chips */}
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

                    {/* Timestamp */}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isUser ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center space-x-2 text-slate-500 text-xs p-2 bg-white rounded-xl border border-slate-200 w-fit">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-200" />
                <span className="text-[11px] font-medium text-slate-600">
                  Consulting Gemini 2.5 Flash & Hospital Roster...
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Voice Indicator Bar */}
          {isListening && (
            <div className="bg-rose-500 text-white text-[11px] font-bold px-3 py-1.5 flex items-center justify-between animate-pulse">
              <span>{t('listening') || 'Listening to your voice...'}</span>
              <Mic className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Persistent Healthcare Disclaimer */}
          <div className="bg-amber-50 border-t border-amber-200/80 px-3 py-1.5 text-[10px] text-amber-900 flex items-start space-x-1.5">
            <HelpCircle className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>Medical Disclaimer:</strong> Preliminary navigation guidance only; not a doctor or clinical diagnosis. In emergency, rush to Sanjeevan ER or dial 112.
            </p>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleMic}
                title="Voice Query"
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe symptoms or ask about hospital..."
              className="flex-1 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shadow-xs transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default AIHealthAssistant;
