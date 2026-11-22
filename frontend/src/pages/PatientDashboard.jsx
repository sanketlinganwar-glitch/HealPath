import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  FileText,
  Calendar,
  Clock,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  QrCode,
  Activity,
  Printer,
  Sparkles,
  Mic,
  LogOut,
  Pencil,
  ArrowRight,
  Bell,
  Check,
  Info,
  CalendarCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getPatientWallet,
  updatePatientProfile,
  getPrescriptionPdfUrl
} from '../api/client';

export function PatientDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'prescriptions' | 'history' | 'appointments' | 'card'
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRx, setSelectedRx] = useState(null);

  // Edit Profile Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [editMedicalHistory, setEditMedicalHistory] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Patient phone resolution: from auth or fallback to query
  const patientPhone = user?.phone || '9876543210';

  useEffect(() => {
    fetchWallet();
  }, [patientPhone]);

  const fetchWallet = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getPatientWallet(patientPhone);
      setWalletData(data);
      if (data.patient) {
        setEditBloodGroup(data.patient.blood_group || 'B+');
        setEditAllergies(data.patient.allergies || 'None reported');
        setEditMedicalHistory(data.patient.medical_history || '');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load Digital Health Wallet records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updatePatientProfile(patientPhone, {
        blood_group: editBloodGroup,
        allergies: editAllergies,
        medical_history: editMedicalHistory
      });
      setIsEditingProfile(false);
      await fetchWallet();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update health profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDownloadPdf = (rxId, rxNumber) => {
    const url = getPrescriptionPdfUrl(rxId);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading Digital Health Wallet...</p>
      </div>
    );
  }

  if (errorMsg || !walletData) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-md">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Health Wallet Unavailable</h3>
        <p className="text-sm text-slate-500">{errorMsg || 'No patient health record found.'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700"
          >
            Sign In with Mobile
          </button>
          <button
            onClick={fetchWallet}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { patient, active_token, total_visits, prescriptions, appointments, medical_history_summary } = walletData;

  // Filter prescriptions by search term
  const filteredPrescriptions = (prescriptions || []).filter((rx) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      rx.diagnosis?.toLowerCase().includes(term) ||
      rx.doctor_name?.toLowerCase().includes(term) ||
      rx.prescription_number?.toLowerCase().includes(term) ||
      (rx.medicines || []).some((m) => m.name?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* 1. TOP HEALTH IDENTITY BANNER (Apollo-Inspired Healthcare Hero) */}
      <section className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-teal-800/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(13,148,136,0.25),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-teal-500/20 backdrop-blur-md border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
              <HeartPulse className="w-10 h-10 text-teal-300 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{patient.name}</h1>
                <span className="px-3 py-1 rounded-full bg-teal-400/20 border border-teal-300/30 text-teal-200 font-mono text-xs font-bold">
                  UHID: {patient.uhid || `SH-445001-${patient.id}`}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{patient.age} Yrs • {patient.gender?.toUpperCase()}</span>
                <span>Phone: +91 {patient.phone}</span>
                <span>Hospital: Sanjeevan Multispecialty, Yavatmal</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold">
                  Blood Group: {patient.blood_group || 'B+'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
                  Allergies: {patient.allergies || 'None reported'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col items-start md:items-end justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center space-x-1.5 transition touch-target"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              {user && (
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-bold flex items-center space-x-1 transition touch-target"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-teal-300 font-semibold">
              Casualty Helpline: +91 95526 25262
            </p>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE OPD TOKEN ALERT (IF IN PROGRESS OR WAITING) */}
      {active_token && (
        <section className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  Active OPD Visit
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  Token #{active_token.token_number}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Department: <span className="font-semibold text-slate-900">{active_token.department_name}</span> • 
                Patients ahead: <span className="font-bold text-amber-700">{active_token.people_ahead || 0}</span> • 
                Est. wait: <span className="font-bold text-slate-900">~{active_token.est_wait_min || 0} mins</span>
              </p>
            </div>
          </div>
          <Link
            to={`/patient/track/${active_token.id}`}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition shrink-0 touch-target"
          >
            <span>Live Queue Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 text-sm font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap touch-target ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-600" />
          <span>Wallet Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`px-4 py-3 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap touch-target ${
            activeTab === 'prescriptions'
              ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Prescriptions ({prescriptions?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap touch-target ${
            activeTab === 'history'
              ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 text-cyan-600" />
          <span>Medical Timeline ({total_visits || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-3 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap touch-target ${
            activeTab === 'appointments'
              ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>Appointments ({appointments?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('card')}
          className={`px-4 py-3 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap touch-target ${
            activeTab === 'card'
              ? 'border-teal-600 text-teal-800 bg-teal-50/60 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4 text-purple-600" />
          <span>Digital Health ID Card</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* --- TAB 1: WALLET OVERVIEW & NOTIFICATIONS --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Total Consultations</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{total_visits || 0}</p>
              <span className="text-[11px] text-teal-600 font-semibold">Sanjeevan OPD Records</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Verified Prescriptions</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{prescriptions?.length || 0}</p>
              <span className="text-[11px] text-slate-500 font-semibold">Digitally Signed & QR</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Consultations Booked</span>
              <p className="text-2xl sm:text-3xl font-black text-teal-700 mt-1">{appointments?.length || 0}</p>
              <span className="text-[11px] text-slate-500 font-semibold">Guaranteed Slots</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Recorded Allergies</span>
              <p className="text-base sm:text-lg font-bold text-rose-600 mt-1 truncate">{patient.allergies || 'None'}</p>
              <span className="text-[11px] text-slate-500 font-semibold">Clinical Alert</span>
            </div>
          </div>

          {/* Patient In-App Notification Center (Section 7 & 13) */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">Hospital Notification Center</h3>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                Active Updates
              </span>
            </div>

            <div className="space-y-3">
              {active_token && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start space-x-3 text-xs">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">Queue Status: Token #{active_token.token_number} is active</p>
                    <p className="text-slate-600 mt-0.5">
                      Your position is advancing. Approximately {active_token.people_ahead || 0} patient(s) ahead in {active_token.department_name}.
                    </p>
                  </div>
                </div>
              )}

              {appointments && appointments.length > 0 && (
                <div className="p-3.5 bg-teal-50 rounded-2xl border border-teal-200 flex items-start space-x-3 text-xs">
                  <CalendarCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">Appointment Scheduled: {appointments[0].appointment_code}</p>
                    <p className="text-slate-600 mt-0.5">
                      Dr. {appointments[0].doctor_name} ({appointments[0].room}) at {new Date(appointments[0].slot_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Digital Health ID Verified</p>
                  <p className="text-slate-600 mt-0.5">
                    Your unique health identification <strong>{patient.uhid || `SH-445001-${patient.id}`}</strong> is active for seamless check-in at reception.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/book-appointment"
              className="p-5 bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200/90 hover:shadow-md transition flex items-center space-x-3.5 group touch-target"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Book Doctor</h4>
                <p className="text-xs text-slate-500 mt-0.5">Guaranteed slot with specialist</p>
              </div>
            </Link>

            <Link
              to="/patient"
              className="p-5 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200/90 hover:shadow-md transition flex items-center space-x-3.5 group touch-target"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">OPD Token</h4>
                <p className="text-xs text-slate-500 mt-0.5">Join digital queue without waiting</p>
              </div>
            </Link>

            <a
              href="/checkin.html"
              className="p-5 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-200/90 hover:shadow-md transition flex items-center space-x-3.5 group touch-target"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">QR Check-In</h4>
                <p className="text-xs text-slate-500 mt-0.5">Camera arrival confirmation</p>
              </div>
            </a>

            <Link
              to="/voice"
              className="p-5 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200/90 hover:shadow-md transition flex items-center space-x-3.5 group touch-target"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Voice Assistant</h4>
                <p className="text-xs text-slate-500 mt-0.5">Marathi / Hindi / English voice</p>
              </div>
            </Link>
          </div>

          {/* Recent Prescription Card */}
          {prescriptions && prescriptions.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Latest Issued Prescription</h3>
                  <p className="text-xs text-slate-500">Most recent clinical treatment plan from your attending doctor</p>
                </div>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center space-x-1"
                >
                  <span>View All ({prescriptions.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      {prescriptions[0].prescription_number}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                      Verified & Signed
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">{prescriptions[0].doctor_name}</span> ({prescriptions[0].doctor_specialization})
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Diagnosis: <span className="text-slate-800 font-semibold">{prescriptions[0].diagnosis}</span> • 
                    Medicines: <span className="font-semibold">{prescriptions[0].medicines?.length || 0} prescribed</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRx(prescriptions[0])}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(prescriptions[0].id, prescriptions[0].prescription_number)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: PRESCRIPTIONS LIST --- */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by diagnosis, medicine, or doctor..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Showing {filteredPrescriptions.length} of {prescriptions?.length || 0} prescriptions
            </p>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="font-bold text-slate-800">No Prescriptions Found</h4>
              <p className="text-xs text-slate-500">Your doctor has not issued prescriptions matching this query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-teal-400 transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {rx.prescription_number || `RX-${rx.id}`}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Digitally Signed</span>
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{rx.doctor_name}</h4>
                    <p className="text-xs text-teal-700 font-medium">{rx.doctor_specialization}</p>
                    <p className="text-xs text-slate-600">
                      <strong>Diagnosis:</strong> {rx.diagnosis}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Date: {new Date(rx.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedRx(rx)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                    >
                      View Medicines ({rx.medicines?.length || 0})
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(rx.id, rx.prescription_number)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: MEDICAL HISTORY TIMELINE --- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Hospital Consultation Timeline</h3>
            <p className="text-xs text-slate-500">Comprehensive chronological log of your OPD visits and treatments</p>
          </div>

          {!medical_history_summary || medical_history_summary.length === 0 ? (
            <p className="text-xs text-slate-500">No previous consultations recorded.</p>
          ) : (
            <div className="relative border-l-2 border-teal-200 ml-4 space-y-6 py-2">
              {medical_history_summary.map((event, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className="absolute -left-2 top-1.5 w-4 h-4 rounded-full bg-teal-600 ring-4 ring-white" />
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md">
                      {event.date}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 mt-1">{event.doctor} ({event.department})</h5>
                    <p className="text-xs text-slate-600"><strong>Finding:</strong> {event.diagnosis}</p>
                    {event.notes && <p className="text-xs text-slate-500 italic">Notes: {event.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: APPOINTMENTS --- */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Booked Doctor Appointments</h3>
            <Link
              to="/book-appointment"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition touch-target"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book New Slot</span>
            </Link>
          </div>

          {!appointments || appointments.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Calendar className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="font-bold text-slate-800">No Appointments Booked</h4>
              <p className="text-xs text-slate-500">Schedule your consultation online to avoid waiting.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                      {appt.appointment_code}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      appt.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : appt.status === 'checked_in'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {appt.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{appt.doctor_name}</h4>
                    <p className="text-xs text-teal-700 font-medium">{appt.department_name} • {appt.room}</p>
                    <p className="text-xs text-slate-600 font-semibold mt-1">
                      Slot: {new Date(appt.slot_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 5: DIGITAL HEALTH ID CARD --- */}
      {activeTab === 'card' && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-800/40 relative overflow-hidden space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-sm">
                  S
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight leading-tight">Sanjeevan Care</h4>
                  <p className="text-[9px] text-teal-300">Yavatmal Hospital ID</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30">
                OFFICIAL HEALTH ID
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xl font-black text-white">{patient.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-teal-100">
                <div>
                  <span className="text-[10px] text-teal-300 font-bold uppercase">UHID:</span>
                  <p className="font-mono font-bold">{patient.uhid || `SH-445001-${patient.id}`}</p>
                </div>
                <div>
                  <span className="text-[10px] text-teal-300 font-bold uppercase">Mobile:</span>
                  <p className="font-mono font-bold">+91 {patient.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-teal-300 font-bold uppercase">Blood Group:</span>
                  <p className="font-bold text-rose-300">{patient.blood_group || 'B+'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-teal-300 font-bold uppercase">Emergency:</span>
                  <p className="font-bold">+91 95526 25262</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Present at reception desk for zero-touch token issuance</span>
              <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-slate-900" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT HEALTH PROFILE */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-900">Edit Patient Health Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Blood Group</label>
                <select
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Known Drug Allergies</label>
                <input
                  type="text"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, None"
                  className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Medical History / Chronic Conditions</label>
                <textarea
                  rows={2}
                  value={editMedicalHistory}
                  onChange={(e) => setEditMedicalHistory(e.target.value)}
                  placeholder="e.g. Hypertension since 2021, Type 2 Diabetes"
                  className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRESCRIPTION DETAILS VIEW */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Prescription #{selectedRx.prescription_number || selectedRx.id}
                </h3>
                <p className="text-xs text-slate-500">{selectedRx.doctor_name} ({selectedRx.doctor_specialization})</p>
              </div>
              <button
                onClick={() => setSelectedRx(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                <span className="font-bold text-teal-900">Clinical Diagnosis:</span>
                <p className="text-teal-800 text-sm font-semibold mt-0.5">{selectedRx.diagnosis}</p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-2">Prescribed Medicines:</h5>
                <div className="space-y-2">
                  {(selectedRx.medicines || []).map((med, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{idx + 1}. {med.name}</span>
                        <span className="text-teal-700">{med.dosage}</span>
                      </div>
                      <p className="text-slate-600">Frequency: {med.frequency} • Duration: {med.duration}</p>
                      {med.instructions && <p className="text-slate-500 italic">Directions: {med.instructions}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRx.clinical_notes && (
                <div>
                  <h5 className="font-bold text-slate-900">Clinical Advice:</h5>
                  <p className="text-slate-600 mt-0.5">{selectedRx.clinical_notes}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleDownloadPdf(selectedRx.id, selectedRx.prescription_number)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </button>
              <button
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
