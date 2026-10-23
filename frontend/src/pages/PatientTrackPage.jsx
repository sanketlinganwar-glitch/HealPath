import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  Users,
  MapPin,
  Share2,
  CalendarClock,
  MessageCircle,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Phone
} from 'lucide-react';
import { getToken, rescheduleToken, getTokenMessages } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import { useLanguage } from '../context/LanguageContext';
import { ChatWidget } from '../components/ChatWidget';

export function PatientTrackPage() {
  const { id } = useParams();
  const [tokenData, setTokenData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const { t } = useLanguage();

  const fetchTokenData = async () => {
    if (!id) return;
    try {
      const data = await getToken(id);
      setTokenData(data);
      const msgs = await getTokenMessages(id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Live polling every 5s
  usePolling(fetchTokenData, 5000);

  const handleReschedule = async (delayMin) => {
    setRescheduling(true);
    try {
      const updated = await rescheduleToken(id, delayMin);
      setTokenData((prev) => ({ ...prev, ...updated }));
      const msgs = await getTokenMessages(id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setRescheduling(false);
    }
  };

  const getWhatsAppShareUrl = () => {
    if (!tokenData) return '';
    const shareText = encodeURIComponent(
      `🏥 *HealPath Hospital Token Update*\n` +
      `Token: *${tokenData.token_number}*\n` +
      `Department: ${tokenData.department_name}\n` +
      `Status: ${tokenData.status.toUpperCase()}\n` +
      `Position in Queue: ${tokenData.position || 'N/A'}\n` +
      `Estimated Wait: ${tokenData.est_wait_min || 0} minutes\n` +
      `Track Live: ${window.location.href}`
    );
    return `https://wa.me/?text=${shareText}`;
  };

  if (loading && !tokenData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Retrieving live token status...</p>
      </div>
    );
  }

  if (!tokenData) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-white rounded-3xl shadow-sm border border-slate-200">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">Token Not Found</h3>
        <p className="text-xs text-slate-500 mb-4">The requested token could not be located in our system.</p>
        <Link to="/patient" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-block">
          Register New Token
        </Link>
      </div>
    );
  }

  const isWaiting = tokenData.status === 'waiting';
  const isInProgress = tokenData.status === 'in_progress';
  const isCompleted = tokenData.status === 'completed';
  const isSkipped = tokenData.status === 'skipped';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Real-time sync badge */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          <span className="font-semibold text-slate-700">Live Connected • Polling every 5s</span>
        </div>
        <span>Patient: <strong className="text-slate-800">{tokenData.patient?.name}</strong></span>
      </div>

      {/* Hero Token Card */}
      <div className={`p-6 sm:p-10 rounded-3xl shadow-xl border transition-all ${
        isInProgress
          ? 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white border-emerald-500/50 shadow-emerald-500/10'
          : isCompleted
          ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-slate-700'
          : isSkipped
          ? 'bg-gradient-to-br from-slate-800 via-rose-950 to-slate-900 text-white border-rose-800'
          : 'bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white border-blue-500/30'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-white/10 backdrop-blur-md inline-block mb-2">
              {tokenData.department_name}
            </span>
            <p className="text-xs text-blue-200">
              {tokenData.priority === 'emergency' ? '🚨 Emergency Priority' : tokenData.priority === 'senior' ? '👴 Senior Citizen Priority' : 'Standard Queue'}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs ${
              isInProgress
                ? 'bg-emerald-400 text-emerald-950 animate-pulse'
                : isCompleted
                ? 'bg-blue-300 text-blue-950'
                : isSkipped
                ? 'bg-rose-400 text-rose-950'
                : 'bg-amber-400 text-amber-950'
            }`}>
              {isInProgress ? t('statusInProgress') : isCompleted ? t('statusCompleted') : isSkipped ? t('statusSkipped') : t('statusWaiting')}
            </span>
          </div>
        </div>

        {/* Huge Token Number Display */}
        <div className="py-8 sm:py-12 text-center space-y-2">
          <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-cyan-300">
            {t('yourToken')}
          </p>
          <div className="text-6xl sm:text-8xl font-black tracking-tight font-mono text-white drop-shadow-md">
            {tokenData.token_number}
          </div>
          {tokenData.room && (
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-bold mt-2 animate-bounce">
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>Proceed to {tokenData.room} ({tokenData.doctor_name})</span>
            </div>
          )}
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-center">
          <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-xs">
            <span className="block text-[11px] text-blue-200 uppercase tracking-wider mb-1 font-semibold">
              Queue Position
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {tokenData.position || '—'}
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-xs">
            <span className="block text-[11px] text-blue-200 uppercase tracking-wider mb-1 font-semibold">
              {t('peopleAhead')}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {tokenData.people_ahead !== null && tokenData.people_ahead !== undefined ? tokenData.people_ahead : '—'}
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-xs">
            <span className="block text-[11px] text-blue-200 uppercase tracking-wider mb-1 font-semibold">
              {t('estWait')}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-cyan-300">
              {isWaiting ? `~${tokenData.est_wait_min}m` : '0m'}
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-xs">
            <span className="block text-[11px] text-blue-200 uppercase tracking-wider mb-1 font-semibold">
              Now Serving
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {tokenData.now_serving || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls: WhatsApp & Reschedule */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* WhatsApp Share Card */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Live Sharing</span>
            </h4>
            <p className="text-xs text-slate-500">
              Share real-time token tracking with family & caregivers
            </p>
          </div>
          <a
            href={getWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </a>
        </div>

        {/* Reschedule Turn Card (Waiting tokens only) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <span>{t('rescheduleBtn')}</span>
            </h4>
            <p className="text-xs text-slate-500">
              Running late? Delay your turn by 15, 30, or 60 minutes
            </p>
          </div>
          {isWaiting ? (
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                disabled={rescheduling}
                onClick={() => handleReschedule(15)}
                className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition"
              >
                {t('delay15')}
              </button>
              <button
                type="button"
                disabled={rescheduling}
                onClick={() => handleReschedule(30)}
                className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition"
              >
                {t('delay30')}
              </button>
              <button
                type="button"
                disabled={rescheduling}
                onClick={() => handleReschedule(60)}
                className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 transition"
              >
                {t('delay60')}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Reschedule is available only while token is waiting.
            </p>
          )}
        </div>
      </div>

      {/* Messages Section (System and Staff updates) */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-blue-600" />
            <span>{t('messagesFromStaff')}</span>
          </h3>
          <span className="text-xs text-slate-400">{messages.length} update(s)</span>
        </div>

        {messages.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">{t('noMessages')}</p>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl text-xs flex items-start space-x-2.5 ${
                  msg.kind === 'staff'
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                <div className="mt-0.5">
                  {msg.kind === 'staff' ? (
                    <Activity className="w-4 h-4 text-blue-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      {msg.kind === 'staff' ? 'Doctor / Staff Instruction' : 'Automated System Alert'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-medium leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Embedded Chat Widget for instant AI query */}
      <ChatWidget tokenId={tokenData.id} />
    </div>
  );
}
