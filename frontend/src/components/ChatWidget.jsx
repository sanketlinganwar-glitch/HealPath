import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertTriangle } from 'lucide-react';
import { chat } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export function ChatWidget({ tokenId = null, onAction = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am HealPath AI Assistant. How can I assist you with your token or hospital visit today?',
      actions: [
        { label: 'Check Queue Wait', action: 'check_wait' },
        { label: 'Hospital Departments', action: 'view_departments' },
        { label: 'Emergency Help', action: 'emergency' }
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const { lang, setLang, t } = useLanguage();
  const chatBottomRef = useRef(null);

  // Check speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Setup speech recognition
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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

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
        console.error(err);
      }
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (manualText = null) => {
    const textToSend = manualText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await chat(textToSend, lang, tokenId);
      const botMsg = {
        sender: 'bot',
        text: res.reply,
        intent: res.intent,
        actions: res.suggested_actions || []
      };
      setMessages((prev) => [...prev, botMsg]);
      speakText(res.reply);
    } catch (err) {
      const errorMsg = {
        sender: 'bot',
        text: 'Sorry, I had trouble processing that. Please check with hospital reception desk.',
        actions: []
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (action === 'check_wait') {
      handleSend('What is the current queue status and wait time?');
    } else if (action === 'view_departments') {
      handleSend('Which hospital departments and doctors are available?');
    } else if (action === 'emergency') {
      handleSend('EMERGENCY: Need immediate urgent medical help!');
    } else if (onAction) {
      onAction(action);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-700 to-cyan-600 text-white rounded-full shadow-xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="Open Hospital Assistant"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:inline">
            {t('assistantTitle')}
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-200" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">{t('assistantTitle')}</h3>
                <p className="text-[10px] text-blue-100 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
                  <span>Multilingual AI Guide</span>
                </p>
              </div>
            </div>

            {/* Language & Sound & Close */}
            <div className="flex items-center space-x-1">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-white/20 text-white text-xs rounded-md px-1.5 py-0.5 border border-white/30 focus:outline-none"
              >
                <option value="en" className="text-slate-900">EN</option>
                <option value="hi" className="text-slate-900">हिंदी</option>
                <option value="mr" className="text-slate-900">मराठी</option>
              </select>
              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? 'Mute Speech' : 'Enable Speech'}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10"
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-300" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 text-xs sm:text-sm">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                      : m.intent === 'emergency'
                      ? 'bg-rose-50 text-rose-950 border border-rose-300 rounded-bl-xs font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  {m.intent === 'emergency' && (
                    <div className="flex items-center space-x-1 text-rose-600 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{t('emergencyAlert')}</span>
                    </div>
                  )}
                  {m.text}
                </div>

                {/* Suggested Action Chips */}
                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.actions.map((act, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleActionClick(act.action)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-full transition"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-1.5 text-slate-500 text-xs p-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                <span className="ml-1 text-[11px]">Consulting HealPath...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Voice Indicator */}
          {isListening && (
            <div className="bg-amber-500 text-white text-[11px] font-bold px-3 py-1.5 flex items-center justify-between animate-pulse">
              <span>{t('listening')}</span>
              <Mic className="w-3.5 h-3.5" />
            </div>
          )}

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
                title="Voice Assistant"
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
              placeholder={t('typeMessage')}
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
