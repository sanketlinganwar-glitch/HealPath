import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  Calendar,
  Clock,
  Printer,
  FileText,
  ToggleLeft,
  ToggleRight,
  Stethoscope,
  Scissors,
  CheckCircle2,
  Building2,
  Search,
  Filter,
  MessageSquare,
  Radio,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Flame,
  CheckCircle,
  XCircle,
  Send,
  Cpu,
  Wifi,
  Eye,
  Smartphone
} from 'lucide-react';
import {
  getStats,
  getDoctors,
  getAppointments,
  getOTSchedule,
  updateDoctorStatus,
  getDepartmentHeatmap,
  getConsultationVelocity,
  getNotificationStatus,
  retryNotification,
  optOutNotification,
  optInNotification,
  getHardwareDevices,
  getHardwareHistory,
  simulateHardwareCall,
  showToast
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [otSchedule, setOtSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorSearch, setDoctorSearch] = useState('');

  // Stage 9: Analytics & Heatmap State
  const [heatmapRange, setHeatmapRange] = useState('today');
  const [heatmapData, setHeatmapData] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [velocityData, setVelocityData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Stage 9: Notification Administration State
  const [notificationStats, setNotificationStats] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testOptOutPhone, setTestOptOutPhone] = useState('');
  const [retryingId, setRetryingId] = useState(null);

  // Stage 9: Physical Hardware Calling Gateway State
  const [hardwareDevices, setHardwareDevices] = useState([]);
  const [hardwareHistory, setHardwareHistory] = useState([]);
  const [simToken, setSimToken] = useState('C-014');
  const [simCabin, setSimCabin] = useState('101');
  const [simEventType, setSimEventType] = useState('CALL_NEXT');
  const [simulatingCall, setSimulatingCall] = useState(false);
  const [virtualDisplayToken, setVirtualDisplayToken] = useState('C-012');
  const [virtualDisplayCabin, setVirtualDisplayCabin] = useState('101');

  const fetchAdminData = async () => {
    try {
      const [s, d, a, ot] = await Promise.all([
        getStats(),
        getDoctors(),
        getAppointments(),
        getOTSchedule()
      ]);
      setStats(s);
      setDoctors(d || []);
      setAppointments(a || []);
      setOtSchedule(ot || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStage9Analytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [hm, vel] = await Promise.all([
        getDepartmentHeatmap({ range: heatmapRange, department_id: selectedDeptId || undefined }),
        getConsultationVelocity({ range: heatmapRange, department_id: selectedDeptId || undefined })
      ]);
      setHeatmapData(hm);
      setVelocityData(vel);
    } catch (err) {
      console.error('Failed to load Stage 9 analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchNotificationData = async () => {
    setNotifLoading(true);
    try {
      const res = await getNotificationStatus();
      setNotificationStats(res);
    } catch (err) {
      console.error('Failed to load notification stats:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const fetchHardwareData = async () => {
    try {
      const [devs, hist] = await Promise.all([
        getHardwareDevices(),
        getHardwareHistory()
      ]);
      setHardwareDevices(devs?.devices || []);
      setHardwareHistory(hist?.history || []);
      if (hist?.history && hist.history.length > 0) {
        setVirtualDisplayToken(hist.history[0].token_number);
        setVirtualDisplayCabin(hist.history[0].cabin_id);
      }
    } catch (err) {
      console.error('Failed to load hardware devices:', err);
    }
  };

  usePolling(fetchAdminData, 6000);

  useEffect(() => {
    if (activeTab === 'heatmap' || activeTab === 'velocity') {
      fetchStage9Analytics();
    } else if (activeTab === 'notifications') {
      fetchNotificationData();
    } else if (activeTab === 'hardware') {
      fetchHardwareData();
    }
  }, [activeTab, heatmapRange, selectedDeptId]);

  const handleToggleDoctorStatus = async (doctor) => {
    const newStatus = doctor.status === 'off' ? 'available' : 'off';
    try {
      await updateDoctorStatus(doctor.id, newStatus);
      showToast(`${doctor.name} is now ${newStatus}`, 'success');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update doctor status', 'error');
    }
  };

  const handleRetryNotification = async (logId) => {
    setRetryingId(logId);
    try {
      await retryNotification(logId);
      showToast('Notification re-dispatched successfully', 'success');
      fetchNotificationData();
    } catch (err) {
      console.error(err);
      showToast('Failed to retry notification', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const handleOptOutToggle = async (phone, isOptedOut) => {
    if (!phone) {
      showToast('Please enter a phone number', 'warning');
      return;
    }
    try {
      if (isOptedOut) {
        await optInNotification(phone);
        showToast(`Consent restored for ${phone}`, 'success');
      } else {
        await optOutNotification(phone, 'Admin simulated opt-out');
        showToast(`${phone} opted out under DPDP rules`, 'success');
      }
      fetchNotificationData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update opt-out status', 'error');
    }
  };

  const handleTriggerSimulatedCall = async (e) => {
    e?.preventDefault();
    setSimulatingCall(true);
    try {
      const res = await simulateHardwareCall({
        token_number: simToken,
        cabin_id: simCabin,
        event_type: simEventType
      });
      setVirtualDisplayToken(simToken);
      setVirtualDisplayCabin(simCabin);
      showToast(`Hardware display call broadcast: ${simToken} to Cabin ${simCabin}`, 'success');
      fetchHardwareData();
    } catch (err) {
      console.error(err);
      showToast('Failed to dispatch hardware call', 'error');
    } finally {
      setSimulatingCall(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.department_name?.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hospital Operations Administration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time OPD throughput, staff duty rosters, department heatmaps, WhatsApp omnichannel & hardware gateway
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintReport}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Daily Summary</span>
        </button>
      </div>

      {/* Printable Report Title (Only visible in Print) */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">
          Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
        </h1>
        <p className="text-xs text-slate-600">Daily Operations & OPD Roster Report &bull; {new Date().toLocaleDateString()}</p>
      </div>

      {/* Responsive KPI Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total OPD Tokens
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.total_tokens || 0}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Generated today</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Completed Consults
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {stats?.completed || 0}
            </span>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
              Avg Duration: {stats?.avg_consult_min || 8} min
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Waiting in Queue
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600">
              {stats?.waiting || 0}
            </span>
            <p className="text-[11px] text-amber-700 mt-1 font-semibold">
              Avg Wait: {stats?.avg_wait_min || 0} min
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Doctors on Duty
            </span>
            <span className="text-2xl sm:text-3xl font-black text-blue-600">
              {doctors.filter((d) => d.status !== 'off').length} / {doctors.length}
            </span>
            <p className="text-[11px] text-blue-700 mt-1 font-semibold">
              {stats?.by_department?.length || 5} Departments Active
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Responsive Navigation Tabs (Horizontal Scroll on Mobile) */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none -mx-2 px-2 text-xs sm:text-sm font-bold print:hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Department Overview
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 flex items-center space-x-1.5 ${
            activeTab === 'heatmap'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Bottleneck Heatmap</span>
        </button>
        <button
          onClick={() => setActiveTab('velocity')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 flex items-center space-x-1.5 ${
            activeTab === 'velocity'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Consultation Velocity</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 flex items-center space-x-1.5 ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <span>WhatsApp & SMS</span>
        </button>
        <button
          onClick={() => setActiveTab('hardware')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 flex items-center space-x-1.5 ${
            activeTab === 'hardware'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-500" />
          <span>Cabin LED Displays</span>
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'doctors'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff & Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'appointments'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Appointments ({appointments.length})
        </button>
        <button
          onClick={() => setActiveTab('ot')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'ot'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          OT Schedule ({otSchedule.length})
        </button>
      </div>

      {/* Tab 1: Department Overview (Preserved Baseline) */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Department Performance Breakdown
            </h3>
            <span className="text-xs text-slate-500">Live OPD Metrics</span>
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[550px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Waiting</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Avg Wait</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.by_department?.map((d) => (
                  <tr key={d.department_id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.department_name}</td>
                    <td className="py-3 px-4 font-semibold text-amber-600">{d.waiting} patients</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{d.completed} patients</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{d.avg_wait_min}m</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          d.waiting > 8
                            ? 'bg-rose-100 text-rose-800'
                            : d.waiting > 4
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {d.waiting > 8 ? 'Congested' : d.waiting > 4 ? 'Moderate' : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden space-y-3">
            {stats?.by_department?.map((d) => (
              <div key={d.department_id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{d.department_name}</span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      d.waiting > 8
                        ? 'bg-rose-100 text-rose-800'
                        : d.waiting > 4
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {d.waiting > 8 ? 'Congested' : d.waiting > 4 ? 'Moderate' : 'Optimal'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">Waiting</span>
                    <span className="font-black text-amber-600">{d.waiting}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">Done</span>
                    <span className="font-black text-emerald-600">{d.completed}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold">Avg Wait</span>
                    <span className="font-black text-slate-700">{d.avg_wait_min}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Department Bottleneck Heatmap (Stage 9) */}
      {activeTab === 'heatmap' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Department Bottleneck Congestion Heatmap
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hourly OPD arrival, consultation throughput & congestion rating (Normal &lt;15m, Moderate 15-30m, High 30-45m, Critical &gt;45m)
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                {['today', '7d', '30d'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setHeatmapRange(r)}
                    className={`px-3 py-1 rounded-lg transition capitalize ${
                      heatmapRange === r ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchStage9Analytics}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Insufficient Data Alert Badge */}
          {heatmapData?.insufficient_data && (
            <div className="flex items-start space-x-3 p-3 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Historical Sample Alert: </span>
                <span>{heatmapData.insufficient_data_note} (Sample size: {heatmapData.sample_size} tokens)</span>
              </div>
            </div>
          )}

          {/* Heatmap Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-center text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-left">Department</th>
                  {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((h) => (
                    <th key={h} className="py-3 px-2">{h}</th>
                  ))}
                  <th className="py-3 px-3 text-right">Peak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heatmapData?.heatmap?.map((row) => (
                  <tr key={row.department_id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-left font-bold text-slate-900 whitespace-nowrap">
                      {row.department_name}
                      <span className="block text-[10px] font-mono font-normal text-slate-400">{row.department_code}</span>
                    </td>
                    {row.hourly_cells?.map((cell) => {
                      const level = cell.congestion_level;
                      const bgClass =
                        level === 'Critical'
                          ? 'bg-rose-500 text-white font-bold'
                          : level === 'High'
                          ? 'bg-orange-400 text-white font-bold'
                          : level === 'Moderate'
                          ? 'bg-amber-100 text-amber-900 font-semibold'
                          : 'bg-emerald-50 text-emerald-800';
                      return (
                        <td key={cell.hour} className="p-1.5">
                          <div className={`p-1.5 rounded-xl text-[10px] transition ${bgClass}`} title={`${level}: ${cell.avg_wait_min}m wait, ${cell.arrivals} arrivals`}>
                            <span className="block font-bold">{cell.arrivals} arr</span>
                            <span className="block text-[9px] opacity-80">{cell.avg_wait_min}m</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                      {row.summary?.peak_hour || '11:00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Legend:</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span>
                <span>Normal (&lt;15m)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300"></span>
                <span>Moderate (15-30m)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-orange-400"></span>
                <span>High (30-45m)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-500"></span>
                <span>Critical (&gt;45m)</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">Showing {heatmapRange} OPD aggregation</span>
          </div>

          {/* Bottleneck Alerts */}
          {heatmapData?.bottleneck_alerts && heatmapData.bottleneck_alerts.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Active Bottleneck Triggers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {heatmapData.bottleneck_alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl border flex items-center space-x-3 text-xs ${
                      alert.severity === 'critical'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Consultation Velocity (Stage 9) */}
      {activeTab === 'velocity' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Consultation Velocity & OPD Throughput
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctor consultation pace, completions per hour, queue wait durations & walk-in vs appointment volume
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {['today', '7d', '30d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setHeatmapRange(r)}
                  className={`px-3 py-1 rounded-lg transition capitalize ${
                    heatmapRange === r ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Velocity KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Throughput Velocity</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {velocityData?.overall_velocity_per_hour || 0}
              </span>
              <span className="text-[11px] text-slate-500">Patients completed / hour</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Consult Duration</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {velocityData?.avg_consult_duration_min || 8.5}m
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">Doctor in-cabin time</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Queue Wait</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {velocityData?.avg_wait_duration_min || 12}m
              </span>
              <span className="text-[11px] text-amber-700 font-semibold">Token to call interval</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion Rate</span>
              <span className="text-2xl font-black text-blue-600 mt-1 block">
                {velocityData?.completion_rate_pct || 0}%
              </span>
              <span className="text-[11px] text-blue-700 font-semibold">
                {velocityData?.completed_consultations || 0} of {velocityData?.total_tokens || 0} tokens
              </span>
            </div>
          </div>

          {/* Hourly Completions Throughput Chart */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Hourly Completion Velocity (09:00 - 18:00)</h4>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {velocityData?.hourly_velocity?.map((h) => (
                <div key={h.hour} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">{h.hour_label}</span>
                  <span className="text-lg font-black text-slate-900 block my-1">{h.completions}</span>
                  <span className="text-[9px] font-semibold text-emerald-600 block">{h.throughput_rate}/hr</span>
                </div>
              ))}
            </div>
          </div>

          {/* Source Distribution: Walk-in vs Appointment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Walk-in Registrations</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {velocityData?.source_distribution?.walk_in || 0}
              </span>
              <span className="text-xs text-slate-500">In-person kiosk & reception</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Online Appointments</span>
              <span className="text-xl font-black text-blue-600 mt-1 block">
                {velocityData?.source_distribution?.appointment_online || 0}
              </span>
              <span className="text-xs text-blue-700">Pre-booked scheduled slots</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Escalations</span>
              <span className="text-xl font-black text-rose-600 mt-1 block">
                {velocityData?.source_distribution?.emergency || 0}
              </span>
              <span className="text-xs text-rose-700">Triage priority override</span>
            </div>
          </div>

          {/* Doctor Workload Distribution Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Doctor Workload & Velocity Breakdown</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Specialization</th>
                    <th className="py-3 px-4">Assigned</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">Waiting</th>
                    <th className="py-3 px-4">Avg Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {velocityData?.doctor_workload?.map((doc) => (
                    <tr key={doc.doctor_id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-bold text-slate-900">Dr. {doc.doctor_name}</td>
                      <td className="py-3 px-4 text-slate-600">{doc.specialization}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{doc.assigned_tokens}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{doc.completed_tokens}</td>
                      <td className="py-3 px-4 font-bold text-amber-600">{doc.waiting_tokens}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{doc.avg_consult_min}m</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            doc.duty_status === 'available'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {doc.duty_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: WhatsApp & SMS Omnichannel Gateway (Stage 9) */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  WhatsApp & SMS Omnichannel Dispatch Gateway
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Meta Cloud API v19.0 integration, DPDP Act consent management, trilingual templates & live delivery status
              </p>
            </div>

            {/* Mode Banner Indicator */}
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  notificationStats?.is_live_mode
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${notificationStats?.is_live_mode ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
                <span>{notificationStats?.provider || 'Intelligent Simulation Mode'}</span>
              </span>
              <button
                onClick={fetchNotificationData}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className={`w-4 h-4 ${notifLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Delivery Funnel Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Dispatched</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{notificationStats?.counts?.total || 0}</span>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/80 text-center">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Sent / Live</span>
              <span className="text-2xl font-black text-blue-700 mt-1 block">{notificationStats?.counts?.sent || 0}</span>
            </div>
            <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 text-center">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Simulated</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{notificationStats?.counts?.simulated || 0}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Delivered</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{notificationStats?.counts?.delivered || 0}</span>
            </div>
            <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-200/80 text-center">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Read</span>
              <span className="text-2xl font-black text-teal-700 mt-1 block">{notificationStats?.counts?.read || 0}</span>
            </div>
            <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200/80 text-center">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Opted Out (DPDP)</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">{notificationStats?.counts?.opted_out || 0}</span>
            </div>
          </div>

          {/* DPDP Act Opt-Out / Opt-In Testing Utility */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-800 block">DPDP Act 2023 Consent & Opt-Out Sandbox</span>
              <span className="text-slate-500 text-[11px]">
                Test immediate notification suspension when patient sends "STOP" or revokes consent
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Phone (e.g. 9876543210)"
                value={testOptOutPhone}
                onChange={(e) => setTestOptOutPhone(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs w-44 focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleOptOutToggle(testOptOutPhone, false)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
              >
                Opt-Out
              </button>
              <button
                type="button"
                onClick={() => handleOptOutToggle(testOptOutPhone, true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition"
              >
                Opt-In
              </button>
            </div>
          </div>

          {/* Dispatch Logs Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Recent Dispatch Activity (Trilingual / Zero-PHI)</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Lang</th>
                    <th className="py-3 px-4">Message Snippet</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notificationStats?.recent_logs?.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{log.recipient_name}</span>
                        <span className="font-mono text-[11px] text-slate-500">{log.recipient_phone}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">{log.event_type}</td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.language || 'en'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={log.message_body}>
                        {log.message_body}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            log.delivery_status === 'delivered' || log.delivery_status === 'read'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.delivery_status === 'simulated'
                              ? 'bg-blue-100 text-blue-800'
                              : log.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.delivery_status || log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetryNotification(log.id)}
                            disabled={retryingId === log.id}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition"
                          >
                            {retryingId === log.id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Cabin LED Displays Gateway (Stage 9) */}
      {activeTab === 'hardware' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Physical Calling Hardware Gateway (7-Segment LED Displays)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Microcontroller display gateway (ESP32 / MQTT / HTTP polling) &bull; Zero patient PHI transmitted to physical hardware
              </p>
            </div>

            <button
              onClick={fetchHardwareData}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Virtual 7-Segment LED Display Simulator Unit */}
          <div className="p-6 bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-xl text-center space-y-4">
            <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SANJEEVAN OPD CABIN {virtualDisplayCabin} DISPLAY</span>
              </span>
              <span>PROTOCOL v1.1 &bull; 7-SEGMENT LED</span>
            </div>

            {/* Simulated LED Digits */}
            <div className="py-6 px-4 bg-black/80 rounded-2xl border border-red-950/60 inline-block min-w-[280px]">
              <span className="text-xs font-bold text-red-600/80 tracking-widest block uppercase mb-1">NOW SERVING</span>
              <span className="font-mono text-5xl sm:text-6xl font-black text-red-500 tracking-wider filter drop-shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse">
                {virtualDisplayToken}
              </span>
              <div className="mt-3 pt-2 border-t border-red-950/80 flex items-center justify-around text-xs font-mono text-red-400">
                <span>CABIN: {virtualDisplayCabin}</span>
                <span>STATUS: ACTIVE</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Simulates physical LED board in hallway. Conforms strictly to hospital privacy standards: zero patient names, zero clinical details.
            </p>
          </div>

          {/* Hardware Calling Simulation Form */}
          <form onSubmit={handleTriggerSimulatedCall} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Dispatch Hardware Call Event</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Token Number</label>
                <input
                  type="text"
                  value={simToken}
                  onChange={(e) => setSimToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase font-bold"
                  placeholder="e.g. C-014"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Cabin Number</label>
                <select
                  value={simCabin}
                  onChange={(e) => setSimCabin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  <option value="101">Cabin 101 (General OPD)</option>
                  <option value="102">Cabin 102 (Pediatrics)</option>
                  <option value="103">Cabin 103 (Orthopedics)</option>
                  <option value="104">Cabin 104 (Gynecology)</option>
                  <option value="105">Cabin 105 (Cardiology)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Event Type</label>
                <select
                  value={simEventType}
                  onChange={(e) => setSimEventType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  <option value="CALL_NEXT">CALL_NEXT (Blink + Chime)</option>
                  <option value="NOW_SERVING">NOW_SERVING (Solid Display)</option>
                  <option value="RECALL">RECALL (Urgent Blink)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={simulatingCall}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{simulatingCall ? 'Broadcasting...' : 'Broadcast to Display'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Registered Hardware Units Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Registered Microcontroller Cabin Displays</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Device ID</th>
                    <th className="py-3 px-4">Cabin / Room</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Firmware</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hardwareDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{dev.device_id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700">Cabin {dev.cabin_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{dev.ip_address || '192.168.1.101'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{dev.firmware_version}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            dev.status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {dev.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleTimeString() : 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Staff & Doctors (Preserved Baseline) */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Medical Staff & Duty Rosters
            </h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctor or spec..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      {doc.image_url ? (
                        <div className="w-12 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
                          <img
                            src={doc.image_url}
                            alt={doc.name}
                            loading="lazy"
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                e.currentTarget.nextElementSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="w-full h-full hidden items-center justify-center bg-teal-100 text-teal-800 font-bold text-xs">
                            {doc.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase()}
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-14 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-700 flex flex-col items-center justify-center shrink-0 shadow-xs">
                          <span className="font-extrabold text-xs">{doc.name.replace(/^Dr\.\s*/i, '').slice(0, 2).toUpperCase()}</span>
                          <span className="text-[8px] uppercase font-bold text-teal-600">Doc</span>
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 block">{doc.name}</span>
                        <p className="text-xs text-blue-600 font-semibold">{doc.specialization}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.department_name} &bull; Room {doc.room}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleDoctorStatus(doc)}
                      className="cursor-pointer shrink-0 mt-1"
                      title="Toggle duty status"
                    >
                      {doc.status === 'off' ? (
                        <ToggleLeft className="w-6 h-6 text-slate-400 hover:text-slate-600 transition" />
                      ) : (
                        <ToggleRight className="w-6 h-6 text-blue-600 hover:text-blue-700 transition" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Duty Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      doc.status === 'off'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {doc.status === 'off' ? 'Off Duty' : 'On Duty'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Appointments (Preserved Baseline) */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Scheduled Patient Appointments
            </h3>
            <span className="text-xs text-slate-500">{appointments.length} Total</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {appointments.map((ap) => (
              <div
                key={ap.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-800">{ap.appointment_code}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(ap.slot_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 mt-1">{ap.patient_name}</div>
                  <div className="text-xs text-slate-500">Dr. {ap.doctor_name || 'Assigned'}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    {new Date(ap.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    ap.status === 'checked_in'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {ap.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: OT Schedule (Preserved Baseline) */}
      {activeTab === 'ot' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Operation Theatre (OT) Live Board
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {otSchedule.map((ot) => (
              <div
                key={ot.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-800">{ot.theatre}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ot.status === 'Completed'
                        ? 'bg-slate-200 text-slate-700'
                        : ot.status === 'In Progress'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {ot.status}
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-900">{ot.procedure}</div>
                <div className="text-xs text-slate-500">Lead Surgeon: {ot.surgeon}</div>
                <div className="text-[11px] text-slate-400 font-semibold pt-1">
                  {new Date(ot.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  -{' '}
                  {new Date(ot.end_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
