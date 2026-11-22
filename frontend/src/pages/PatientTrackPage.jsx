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
  Phone,
  Star,
  QrCode,
  ShieldAlert,
  Sparkles,
  Info
} from 'lucide-react';
import { getToken, rescheduleToken, getTokenMessages, submitFeedback, getQueuePrediction, showToast } from '../api/client';
import { usePolling } from '../hooks/usePolling';
import { useLanguage } from '../context/LanguageContext';
import { ChatWidget } from '../components/ChatWidget';
import { QRCodeCard } from '../components/QRCodeCard';

export function PatientTrackPage() {
  const { id } = useParams();
  const [tokenData, setTokenData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const { t } = useLanguage();

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!tokenData) return;
    setSubmittingFeedback(true);
    try {
      await submitFeedback({
        token_id: tokenData.id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || undefined
      });
      setFeedbackSubmitted(true);
      showToast('Thank you! Your feedback has been recorded.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const fetchTokenData = async () => {
    if (!id) return;
    try {
      const data = await getToken(id);
      setTokenData(data);
      try {
        const pred = await getQueuePrediction(data.id, null, data.secure_hash);
        setPredictionData(pred);
      } catch (pErr) {
        // Fallback to data fields if standalone endpoint fails
      }
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
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700">Live Queue Sync Active</span>
          <span className="text-slate-400">• Updated every 5s</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Token ID: #{tokenData.id}
        </div>
      </div>
      {/* Emergency Priority Alert Banner */}
      {tokenData.priority === 'emergency' && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start space-x-3 shadow-md">
          <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-rose-800">
                🚨 {t('emergencyPriority') || 'Emergency Priority Active'}
              </h4>
              {tokenData.emergency_verified_by ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
                  {t('verified') || 'Clinically Verified'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  {t('pendingVerification') || 'Pending Clinical Verification'}
                </span>
              )}
            </div>
            <p className="text-xs text-rose-700 mt-0.5 font-medium">
              Reason: {tokenData.emergency_reason || 'Urgent medical triage priority assigned.'}
            </p>
          </div>
        </div>
      )}

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
              {isWaiting ? `~${predictionData?.estimated_wait_min ?? tokenData.est_wait_min ?? 0}m` : '0m'}
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

      {/* Stage 6: AI Predictive Queue Waiting Time Forecast */}
      {isWaiting && (
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-md border border-blue-700/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">Predictive Queue Waiting Time</h4>
                  <span className="text-[10px] bg-cyan-400/20 text-cyan-200 font-mono font-bold px-2 py-0.5 rounded-full">
                    {predictionData?.prediction_mode || tokenData.prediction_mode || 'BASELINE'} Mode
                  </span>
                </div>
                <p className="text-[11px] text-blue-200">
                  Dynamic multi-factor clinical consultation forecast
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                (predictionData?.confidence || tokenData.confidence) === 'HIGH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : (predictionData?.confidence || tokenData.confidence) === 'LOW'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                {(predictionData?.confidence || tokenData.confidence || 'MODERATE')} Reliability
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-blue-200 block mb-0.5">Estimated Turn</span>
              <div className="text-xl sm:text-2xl font-black text-cyan-300">
                ~{predictionData?.estimated_wait_min ?? tokenData.est_wait_min ?? 0}m
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-blue-200 block mb-0.5">Expected Range</span>
              <div className="text-xl sm:text-2xl font-black text-white">
                {predictionData?.wait_time_range_min
                  ? `${predictionData.wait_time_range_min[0]}–${predictionData.wait_time_range_min[1]}m`
                  : tokenData.wait_time_range_min
                  ? `${tokenData.wait_time_range_min[0]}–${tokenData.wait_time_range_min[1]}m`
                  : '—'}
              </div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-blue-200 block mb-0.5">Active Doctor Cabin(s)</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-300">
                {predictionData?.active_doctors_count ?? 1} On Duty
              </div>
            </div>
          </div>

          <p className="text-xs text-blue-100/90 leading-relaxed mb-2">
            {predictionData?.explanation || 'Prediction factors doctor historical velocity, in-progress consultation progress, and department triage load.'}
          </p>

          <div className="flex items-center justify-between text-[10px] text-blue-300/70 pt-2 border-t border-white/10">
            <span className="flex items-center space-x-1">
              <Info className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Approximate estimate. Critical emergency cases receive immediate clinical priority.</span>
            </span>
            <button
              type="button"
              onClick={fetchTokenData}
              className="hover:text-white flex items-center space-x-1 transition underline cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

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

      {/* QR Code Pass & Tracking Token Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{t('secureQRPass') || 'Digital QR Token Pass'}</h4>
              <p className="text-xs text-slate-500">Scan at kiosk, clinic door, or pharmacy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowQR((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            {showQR ? (t('hide') || 'Hide Pass') : (t('showQRPass') || 'View QR Pass')}
          </button>
        </div>

        {showQR && (
          <div className="mt-5 flex justify-center pt-4 border-t border-slate-100">
            <QRCodeCard
              title={`OPD Token Pass - ${tokenData.token_number}`}
              subtitle={`${tokenData.department_name} • ${tokenData.patient?.name}`}
              tokenNumber={tokenData.token_number}
              secureHash={tokenData.secure_hash}
              value={`${window.location.origin}/#/patient/track/${tokenData.id}`}
              details={[
                { label: 'Patient Name', value: tokenData.patient?.name },
                { label: 'Department', value: tokenData.department_name },
                { label: 'Room', value: tokenData.room || 'Assigned on call' },
                { label: 'Priority', value: tokenData.priority?.toUpperCase() }
              ]}
            />
          </div>
        )}
      </div>

      {/* Post-Consultation Feedback Form (when completed) */}
      {isCompleted && (
        <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 rounded-3xl p-6 sm:p-8 shadow-sm border border-teal-200/80 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm">
              <Star className="w-6 h-6 fill-amber-300 stroke-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-teal-950">
                {t('rateExperience') || 'Rate Your Consultation Experience'}
              </h3>
              <p className="text-xs text-teal-800">
                Your feedback helps us improve care delivery and minimize hospital wait times
              </p>
            </div>
          </div>

          {feedbackSubmitted ? (
            <div className="p-4 rounded-2xl bg-white/80 border border-teal-200 text-teal-900 text-center font-bold text-sm">
              ✅ {t('feedbackThanks') || 'Thank you! Your feedback has been recorded successfully.'}
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-teal-900 mb-1.5">
                  {t('overallRating') || 'Overall Rating (1 to 5 Stars)'}
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1.5 focus:outline-hidden transition hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= feedbackRating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-teal-950 ml-2">
                    {feedbackRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-900 mb-1">
                  {t('feedbackComments') || 'Comments or Suggestions (Optional)'}
                </label>
                <textarea
                  rows="2"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Doctor attentiveness, staff behavior, cleanliness, or queue speed..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : (t('submitFeedback') || 'Submit Feedback')}
              </button>
            </form>
          )}
        </div>
      )}

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
