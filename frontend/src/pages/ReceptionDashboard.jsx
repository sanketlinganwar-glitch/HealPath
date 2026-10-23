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
  Activity
} from 'lucide-react';
import {
  getDepartments,
  getQueue,
  updateTokenPriority,
  skipToken,
  requeueToken,
  sendMessage,
  createToken
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

  useEffect(() => {
    getDepartments().then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) {
        setSelectedDeptId(depts[0].id);
      }
    }).catch(console.error);
  }, []);

  const fetchQueue = async () => {
    if (!selectedDeptId) return;
    try {
      const q = await getQueue(selectedDeptId);
      setQueueData(q);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5s
  usePolling(fetchQueue, 5000, !!selectedDeptId);

  const handlePriorityChange = async (tokenId, newPriority) => {
    try {
      await updateTokenPriority(tokenId, newPriority);
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkip = async (tokenId) => {
    try {
      await skipToken(tokenId);
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequeue = async (tokenId) => {
    try {
      await requeueToken(tokenId);
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeTokenForMsg || !msgText.trim()) return;
    try {
      await sendMessage(activeTokenForMsg.id, msgText.trim());
      setShowMessageModal(false);
      setMsgText('');
      setActiveTokenForMsg(null);
    } catch (err) {
      console.error(err);
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
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-7 h-7 text-blue-600" />
            <span>Receptionist Queue Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time OPD queue management, walk-in token generation, and triage adjustments
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowWalkinModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Walk-in Registration</span>
        </button>
      </div>

      {/* Department Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDeptId(dept.id)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              selectedDeptId === dept.id
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{dept.name}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              selectedDeptId === dept.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {dept.waiting_count}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Stats Cards */}
      {queueData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Currently Waiting
            </span>
            <span className="text-2xl font-black text-amber-600">
              {queueData.counts.waiting}
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              In Consultation
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {queueData.counts.in_progress}
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Completed Today
            </span>
            <span className="text-2xl font-black text-blue-600">
              {queueData.counts.completed}
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Skipped / No-Shows
            </span>
            <span className="text-2xl font-black text-slate-500">
              {queueData.counts.skipped}
            </span>
          </div>
        </div>
      )}

      {/* Main Queue Management Table */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Active Queue • {queueData?.department_name}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Auto-refreshes every 5s
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Patient Name & Phone</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Wait Time</th>
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
                    <div className="text-[11px] text-slate-500">{t.patient?.phone} • {t.patient?.age}y</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      In Consultation
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-emerald-700">With {t.doctor_name || 'Doctor'}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">Now Serving</td>
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
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-black text-slate-800 text-sm">
                    {t.token_number}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{t.patient?.name}</div>
                    <div className="text-[11px] text-slate-500">{t.patient?.phone} • {t.patient?.gender}, {t.patient?.age}y</div>
                    {t.symptoms && <p className="text-[11px] text-slate-400 truncate max-w-xs">{t.symptoms}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={t.priority}
                      onChange={(e) => handlePriorityChange(t.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none transition ${
                        t.priority === 'emergency'
                          ? 'bg-rose-100 border-rose-300 text-rose-800'
                          : t.priority === 'senior'
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="normal">Normal</option>
                      <option value="senior">Senior (60+)</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      Waiting ({t.position ? `#${t.position}` : ''})
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-blue-700">
                    ~{t.est_wait_min}m
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      title="Send message to patient"
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
                <tr key={t.id} className="bg-slate-50/50 text-slate-500 hover:bg-slate-100/50 transition">
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

      {/* Walk-in Registration Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
            <h3 className="text-base font-extrabold text-slate-900">Walk-in Patient Token</h3>
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
                <label className="block font-bold text-slate-700 mb-1">Phone Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={walkinForm.phone}
                  onChange={(e) => setWalkinForm({ ...walkinForm, phone: e.target.value.replace(/\D/g, '') })}
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
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Create Walk-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Message to Patient Modal */}
      {showMessageModal && activeTokenForMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scale-up">
            <h3 className="text-sm font-extrabold text-slate-900">
              Send Message to Token {activeTokenForMsg.token_number}
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
