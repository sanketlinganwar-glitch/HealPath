import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  MessageSquare,
  Clock,
  ShieldAlert,
  Search,
  CheckCircle,
  UserCheck,
  Activity,
  ArrowRightLeft,
  X,
  Stethoscope,
  Phone,
  Filter
} from 'lucide-react';
import {
  getDepartments,
  getQueue,
  getDoctors,
  updateTokenPriority,
  skipToken,
  requeueToken,
  sendMessage,
  createToken,
  reassignDoctorQueue,
  flagEmergency,
  showToast
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

export function ReceptionDashboard() {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [activeTokenForMsg, setActiveTokenForMsg] = useState(null);
  const [msgText, setMsgText] = useState('');

  // Doctor Reassignment Modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [deptDoctors, setDeptDoctors] = useState([]);
  const [sourceDocId, setSourceDocId] = useState('');
  const [targetDocId, setTargetDocId] = useState('');
  const [reassignSubmitting, setReassignSubmitting] = useState(false);

  // Walk-in form state
  const [walkinForm, setWalkinForm] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    priority: 'normal',
    symptoms: '',
    source: 'walk_in'
  });

  // Emergency escalation quick modal
  const [emergencyToken, setEmergencyToken] = useState(null);
  const [emergencyReason, setEmergencyReason] = useState('');

  useEffect(() => {
    getDepartments()
      .then((depts) => {
        setDepartments(depts);
        if (depts.length > 0) {
          setSelectedDeptId(depts[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch departments:', err);
        showToast('Unable to load hospital departments', 'error');
      });
  }, []);

  const fetchQueue = async () => {
    if (!selectedDeptId) return;
    try {
      const q = await getQueue(selectedDeptId);
      setQueueData(q);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5 seconds
  usePolling(fetchQueue, 5000, !!selectedDeptId);

  // Load doctors whenever department changes (for reassignment modal)
  useEffect(() => {
    if (selectedDeptId) {
      getDoctors(selectedDeptId)
        .then((docs) => setDeptDoctors(docs || []))
        .catch(console.error);
    }
  }, [selectedDeptId]);

  const handlePriorityChange = async (tokenId, newPriority) => {
    try {
      await updateTokenPriority(tokenId, newPriority);
      showToast(`Priority updated to ${newPriority}`, 'success');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast('Failed to update priority', 'error');
    }
  };

  const handleSkip = async (tokenId) => {
    try {
      await skipToken(tokenId);
      showToast('Patient token skipped', 'warning');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast('Failed to skip token', 'error');
    }
  };

  const handleRequeue = async (tokenId) => {
    try {
      await requeueToken(tokenId);
      showToast('Patient requeued back into line', 'success');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast('Failed to requeue token', 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeTokenForMsg || !msgText.trim()) return;
    try {
      await sendMessage(activeTokenForMsg.id, msgText.trim());
      showToast(`SMS sent to ${activeTokenForMsg.patient?.name}`, 'success');
      setShowMessageModal(false);
      setMsgText('');
      setActiveTokenForMsg(null);
    } catch (err) {
      console.error(err);
      showToast('Failed to deliver message', 'error');
    }
  };

  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    try {
      await createToken({
        ...walkinForm,
        age: parseInt(walkinForm.age, 10),
        department_id: selectedDeptId,
        source: 'walk_in'
      });
      showToast(`Walk-in registered for ${walkinForm.name}`, 'success');
      setShowWalkinModal(false);
      setWalkinForm({
        name: '',
        phone: '',
        age: '',
        gender: 'male',
        priority: 'normal',
        symptoms: '',
        source: 'walk_in'
      });
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast('Failed to generate walk-in token', 'error');
    }
  };

  // Doctor Reassignment Handler
  const handleOpenReassignModal = async () => {
    try {
      const docs = await getDoctors(selectedDeptId);
      setDeptDoctors(docs || []);
      if (docs && docs.length >= 2) {
        setSourceDocId(docs[0].id);
        setTargetDocId(docs[1].id);
      } else if (docs && docs.length === 1) {
        setSourceDocId(docs[0].id);
        setTargetDocId('');
      }
      setShowReassignModal(true);
    } catch (err) {
      console.error(err);
      showToast('Unable to load doctor roster for reassignment', 'error');
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!sourceDocId || !targetDocId) {
      showToast('Please select both source and target doctors', 'warning');
      return;
    }
    if (sourceDocId === targetDocId) {
      showToast('Source and target doctor cannot be the same', 'warning');
      return;
    }

    setReassignSubmitting(true);
    try {
      const res = await reassignDoctorQueue(Number(sourceDocId), Number(targetDocId));
      showToast(
        `Successfully reassigned ${res.reassigned_count || 0} waiting patient(s)`,
        'success'
      );
      setShowReassignModal(false);
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast(
        err.response?.data?.detail || 'Failed to reassign waiting queue',
        'error'
      );
    } finally {
      setReassignSubmitting(false);
    }
  };

  // Emergency Escalation Handler
  const handleOpenEmergency = (token) => {
    setEmergencyToken(token);
    setEmergencyReason(token.symptoms || 'Acute clinical distress observed by reception triage.');
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!emergencyToken) return;
    try {
      await flagEmergency(emergencyToken.id, emergencyReason.trim());
      showToast(`🚨 Token ${emergencyToken.token_number} escalated to EMERGENCY`, 'error');
      setEmergencyToken(null);
      setEmergencyReason('');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast('Failed to flag emergency triage', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Reception Queue Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time OPD triage, token queue reassignments, and emergency priority
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenReassignModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition"
            title="Reassign waiting queue between doctors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Reassign Queue</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWalkinModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Walk-in Token</span>
          </button>
        </div>
      </div>

      {/* Department Tabs: Smooth Horizontal Scroll */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDeptId(dept.id)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center space-x-2 flex-shrink-0 ${
              selectedDeptId === dept.id
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{dept.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                selectedDeptId === dept.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {dept.waiting_count}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Stats Cards (Mobile 2x2, Desktop 4x1) */}
      {queueData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Waiting in Queue
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-600">
              {queueData.counts.waiting}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              In Consultation
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">
              {queueData.counts.in_progress}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Completed Today
            </span>
            <span className="text-xl sm:text-2xl font-black text-blue-600">
              {queueData.counts.completed}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Skipped / Missed
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-500">
              {queueData.counts.skipped}
            </span>
          </div>
        </div>
      )}

      {/* Main Queue Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
              Active Queue &bull; {queueData?.department_name}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">
            Auto-refreshes (5s)
          </span>
        </div>

        {/* 1. MOBILE QUEUE CARDS (< md screens) */}
        <div className="block md:hidden p-3 space-y-3">
          {/* In Consultation Card */}
          {queueData?.in_progress?.map((t) => (
            <div
              key={t.id}
              className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-black text-emerald-800">
                  {t.token_number}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-900">
                  In Consultation
                </span>
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{t.patient?.name}</div>
                <div className="text-xs text-slate-500">
                  {t.patient?.phone} &bull; With {t.doctor_name || 'Attending Doctor'}
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSkip(t.id)}
                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition"
                >
                  Skip Turn
                </button>
              </div>
            </div>
          ))}

          {/* Waiting Cards */}
          {queueData?.waiting?.map((t) => (
            <div
              key={t.id}
              className={`p-3.5 rounded-2xl border space-y-2.5 transition ${
                t.priority === 'emergency'
                  ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                  : t.priority === 'senior'
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-base font-black text-slate-900">
                    {t.token_number}
                  </span>
                  {t.priority === 'emergency' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                      🚨 EMERGENCY
                    </span>
                  )}
                  {t.priority === 'senior' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      Senior (60+)
                    </span>
                  )}
                </div>
                <span className="text-xs font-extrabold text-blue-700">
                  ~{t.est_wait_min}m {t.wait_time_range_min ? `(${t.wait_time_range_min[0]}–${t.wait_time_range_min[1]}m)` : 'wait'}
                </span>
              </div>

              <div>
                <div className="font-bold text-slate-900 text-sm">{t.patient?.name}</div>
                <div className="text-xs text-slate-500">
                  {t.patient?.phone} &bull; {t.patient?.gender}, {t.patient?.age}y
                </div>
                {t.symptoms && (
                  <p className="text-xs text-slate-600 mt-1 italic line-clamp-2">
                    &ldquo;{t.symptoms}&rdquo;
                  </p>
                )}
              </div>

              {/* Action Controls for Mobile */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                <select
                  value={t.priority}
                  onChange={(e) => handlePriorityChange(t.id, e.target.value)}
                  className={`text-xs font-bold px-2 py-1.5 rounded-lg border focus:outline-none ${
                    t.priority === 'emergency'
                      ? 'bg-rose-100 border-rose-300 text-rose-800'
                      : t.priority === 'senior'
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="normal">Normal</option>
                  <option value="senior">Senior (60+)</option>
                  <option value="emergency">Emergency</option>
                </select>

                <div className="flex items-center space-x-1.5">
                  {t.priority !== 'emergency' && (
                    <button
                      type="button"
                      title="Escalate to Emergency Triage"
                      onClick={() => handleOpenEmergency(t)}
                      className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Send SMS"
                    onClick={() => {
                      setActiveTokenForMsg(t);
                      setShowMessageModal(true);
                    }}
                    className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkip(t.id)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 rounded-lg transition"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Skipped Cards */}
          {queueData?.skipped?.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-2xl bg-slate-100/60 border border-slate-200 text-slate-600 flex items-center justify-between"
            >
              <div>
                <span className="font-mono text-sm font-bold text-slate-700">
                  {t.token_number}
                </span>
                <span className="text-xs text-slate-500 ml-2">{t.patient?.name}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRequeue(t.id)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Requeue</span>
              </button>
            </div>
          ))}

          {queueData?.waiting?.length === 0 && queueData?.in_progress?.length === 0 && (
            <div className="py-10 text-center text-slate-400 text-xs">
              No active patients waiting in {queueData?.department_name} right now.
            </div>
          )}
        </div>

        {/* 2. TABLET & DESKTOP TABLE VIEW (>= md screens) with Horizontal Scroll */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[700px]">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Patient Name & Phone</th>
                <th className="py-3 px-4">Priority / Triage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Est. Wait</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* In-progress rows */}
              {queueData?.in_progress?.map((t) => (
                <tr key={t.id} className="bg-emerald-50/50 hover:bg-emerald-50 transition">
                  <td className="py-3 px-4 font-mono font-black text-emerald-800 text-sm">
                    {t.token_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{t.patient?.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {t.patient?.phone} &bull; {t.patient?.age}y
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      In Consultation
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-emerald-700">
                      With {t.doctor_name || 'Attending Doctor'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-semibold">Now Serving</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSkip(t.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                    >
                      Skip
                    </button>
                  </td>
                </tr>
              ))}

              {/* Waiting rows */}
              {queueData?.waiting?.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-slate-50/80 transition ${
                    t.priority === 'emergency' ? 'bg-rose-50/40' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-black text-slate-800 text-sm">
                    {t.token_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{t.patient?.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {t.patient?.phone} &bull; {t.patient?.gender}, {t.patient?.age}y
                    </div>
                    {t.symptoms && (
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">
                        {t.symptoms}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={t.priority}
                      onChange={(e) => handlePriorityChange(t.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none transition ${
                        t.priority === 'emergency'
                          ? 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse'
                          : t.priority === 'senior'
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="normal">Normal</option>
                      <option value="senior">Senior (60+)</option>
                      <option value="emergency">🚨 Emergency</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      Waiting ({t.position ? `#${t.position}` : ''})
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-blue-700">
                    ~{t.est_wait_min}m {t.wait_time_range_min ? `(${t.wait_time_range_min[0]}–${t.wait_time_range_min[1]}m)` : ''}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {t.priority !== 'emergency' && (
                      <button
                        type="button"
                        title="Escalate to Emergency Triage"
                        onClick={() => handleOpenEmergency(t)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Send SMS to patient"
                      onClick={() => {
                        setActiveTokenForMsg(t);
                        setShowMessageModal(true);
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkip(t.id)}
                      className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      Skip
                    </button>
                  </td>
                </tr>
              ))}

              {/* Skipped rows */}
              {queueData?.skipped?.map((t) => (
                <tr
                  key={t.id}
                  className="bg-slate-50/50 text-slate-500 hover:bg-slate-100/50 transition"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">
                    {t.token_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-700">{t.patient?.name}</div>
                    <div className="text-[11px] text-slate-400">{t.patient?.phone}</div>
                  </td>
                  <td className="py-3 px-4 capitalize">{t.priority}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      Skipped
                    </span>
                  </td>
                  <td className="py-3 px-4">—</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRequeue(t.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Requeue</span>
                    </button>
                  </td>
                </tr>
              ))}

              {queueData?.waiting?.length === 0 && queueData?.in_progress?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No active patients in {queueData?.department_name} queue right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOCTOR REASSIGNMENT MODAL */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Doctor Queue Reassignment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Transfer waiting outpatients from an off-duty or delayed specialist to an available
              physician in {queueData?.department_name || 'this department'}.
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Source Doctor (Currently Assigned) *
                </label>
                <select
                  required
                  value={sourceDocId}
                  onChange={(e) => setSourceDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                >
                  <option value="">-- Select Source Doctor --</option>
                  {deptDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.room || 'Room'} &bull; {doc.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Doctor (New Assignee) *
                </label>
                <select
                  required
                  value={targetDocId}
                  onChange={(e) => setTargetDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                >
                  <option value="">-- Select Target Doctor --</option>
                  {deptDoctors
                    .filter((doc) => String(doc.id) !== String(sourceDocId))
                    .map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.room || 'Room'} &bull; {doc.status})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-800 space-y-1">
                <div className="font-bold">What happens next:</div>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>All pending waiting tokens will transfer to the target doctor.</li>
                  <li>In-consultation tokens will complete with the source doctor.</li>
                  <li>Patients receive an automated SMS notification of their new room.</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassignSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {reassignSubmitting ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY ESCALATION MODAL */}
      {emergencyToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-rose-300 p-5 sm:p-6 space-y-4 animate-scale-up">
            <div className="flex items-center space-x-2 text-rose-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900">
                Escalate Token {emergencyToken.token_number}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Patient: <strong>{emergencyToken.patient?.name}</strong> ({emergencyToken.patient?.phone})
            </p>
            <form onSubmit={handleEmergencySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Triage Reason / Clinical Symptoms *
                </label>
                <textarea
                  rows={3}
                  required
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="e.g. Chest pain radiating to left shoulder, breathlessness..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                🚨 This will promote the patient immediately to the top of the waiting queue.
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEmergencyToken(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs"
                >
                  Escalate Turn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WALK-IN REGISTRATION MODAL */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Walk-in Patient Token
              </h3>
              <button
                type="button"
                onClick={() => setShowWalkinModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalkinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={walkinForm.name}
                  onChange={(e) => setWalkinForm({ ...walkinForm, name: e.target.value })}
                  placeholder="e.g. Anand Shinde"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phone Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={walkinForm.phone}
                  onChange={(e) =>
                    setWalkinForm({
                      ...walkinForm,
                      phone: e.target.value.replace(/\D/g, '')
                    })
                  }
                  placeholder="9822334455"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={120}
                    value={walkinForm.age}
                    onChange={(e) => setWalkinForm({ ...walkinForm, age: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={walkinForm.gender}
                    onChange={(e) => setWalkinForm({ ...walkinForm, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                  value={walkinForm.priority}
                  onChange={(e) => setWalkinForm({ ...walkinForm, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="normal">Normal</option>
                  <option value="senior">Senior (60+)</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Symptoms / Reason</label>
                <textarea
                  rows={2}
                  value={walkinForm.symptoms}
                  onChange={(e) => setWalkinForm({ ...walkinForm, symptoms: e.target.value })}
                  placeholder="Headache, body pain, checkup..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWalkinModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Create Walk-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND MESSAGE TO PATIENT MODAL */}
      {showMessageModal && activeTokenForMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 animate-scale-up">
            <h3 className="text-sm font-extrabold text-slate-900">
              Send SMS to Token {activeTokenForMsg.token_number}
            </h3>
            <p className="text-xs text-slate-500">
              Patient: {activeTokenForMsg.patient?.name} ({activeTokenForMsg.patient?.phone})
            </p>
            <form onSubmit={handleSendMessage} className="space-y-3 text-xs">
              <textarea
                rows={3}
                required
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="e.g. Please proceed to Room 101 for preliminary blood pressure check."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Send to Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
