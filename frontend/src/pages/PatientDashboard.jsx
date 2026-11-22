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
  ArrowRight
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
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 1. TOP HEALTH IDENTITY BANNER */}
      <section className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(56,189,248,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <HeartPulse className="w-10 h-10 text-cyan-300 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{patient.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-300/30 text-cyan-200 font-mono text-xs font-bold">
                  {patient.uhid || `SH-445001-${patient.id}`}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-200/90 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>{patient.age} Yrs • {patient.gender?.toUpperCase()}</span>
                <span>Mobile: +91 {patient.phone}</span>
                <span>Hospital: Sanjeevan Multispecialty, Yavatmal</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold">
                  Blood Group: {patient.blood_group || 'B+'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold">
                  Allergies: {patient.allergies || 'None'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col items-start md:items-end justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Health Profile</span>
              </button>
              {user && (
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-semibold flex items-center space-x-1 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-blue-300 font-medium">
              Casualty Helpline: +91 95526 25262
            </p>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE OPD TOKEN ALERT (IF IN PROGRESS OR WAITING) */}
      {active_token && (
        <section className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition shrink-0"
          >
            <span>Open Live Queue Tracker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Wallet Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'prescriptions'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Prescriptions ({prescriptions?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 text-cyan-600" />
          <span>Medical Timeline ({total_visits || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Appointments ({appointments?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('card')}
          className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 border-b-2 whitespace-nowrap ${
            activeTab === 'card'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4 text-purple-600" />
          <span>Digital Health ID Card</span>
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* --- TAB 1: WALLET OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Consultations</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{total_visits || 0}</p>
              <span className="text-[11px] text-emerald-600 font-semibold">Sanjeevan Hospital OPD</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Verified Prescriptions</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{prescriptions?.length || 0}</p>
              <span className="text-[11px] text-slate-500 font-semibold">Digitally Signed & QR</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Booked Appointments</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{appointments?.length || 0}</p>
              <span className="text-[11px] text-slate-500 font-semibold">Upcoming & Past</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Recorded Allergies</span>
              <p className="text-base sm:text-lg font-bold text-rose-600 mt-1 truncate">{patient.allergies || 'None'}</p>
              <span className="text-[11px] text-slate-500 font-semibold">Clinical Alert</span>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/patient"
              className="p-5 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-200/80 hover:shadow-md transition flex items-center space-x-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Generate OPD Token</h4>
                <p className="text-xs text-slate-500 mt-0.5">Join the digital queue today without waiting</p>
              </div>
            </Link>

            <Link
              to="/book-appointment"
              className="p-5 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200/80 hover:shadow-md transition flex items-center space-x-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Schedule Appointment</h4>
                <p className="text-xs text-slate-500 mt-0.5">Book advance consultation slot with a specialist</p>
              </div>
            </Link>

            <Link
              to="/voice"
              className="p-5 bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-200/80 hover:shadow-md transition flex items-center space-x-3.5 group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Voice Assistant</h4>
                <p className="text-xs text-slate-500 mt-0.5">Talk in Marathi, Hindi, or English for easy navigation</p>
              </div>
            </Link>
          </div>

          {/* Recent Prescription Card */}
          {prescriptions && prescriptions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Latest Issued Prescription</h3>
                  <p className="text-xs text-slate-500">Most recent treatment plan from your attending doctor</p>
                </div>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <span>View All ({prescriptions.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      {prescriptions[0].prescription_number}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                      Verified & Signed
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{prescriptions[0].doctor_name}</span> ({prescriptions[0].doctor_specialization})
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Diagnosis: <span className="text-slate-800 font-semibold">{prescriptions[0].diagnosis}</span> • 
                    Medicines: <span className="font-semibold">{prescriptions[0].medicines?.length || 0} prescribed</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRx(prescriptions[0])}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg transition"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(prescriptions[0].id, prescriptions[0].prescription_number)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
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
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by diagnosis, medicine, or doctor..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Showing {filteredPrescriptions.length} of {prescriptions?.length || 0} prescriptions
            </p>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No prescriptions matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{rx.prescription_number}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Digitally Signed</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Issued: {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'Today'} • {rx.department_name || 'General OPD'}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold text-slate-900">{rx.doctor_name}</p>
                      <p className="text-[11px] text-slate-500">{rx.doctor_qualification || 'MBBS, MD'} • Reg: {rx.doctor_registration || 'MMC'}</p>
                    </div>
                  </div>

                  {/* Diagnosis & Summary */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Diagnosis</span>
                    <p className="text-sm font-bold text-slate-800">{rx.diagnosis}</p>
                  </div>

                  {/* Medicines Chips */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Medications</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(rx.medicines || []).map((m, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-xs font-medium"
                        >
                          {m.name} ({m.dosage}) - <span className="text-blue-600">{m.frequency}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRx(rx)}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                      >
                        View Full Details
                      </button>
                      {rx.verification_token && (
                        <Link
                          to={`/verify-rx/${rx.verification_token}`}
                          className="px-3 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold flex items-center space-x-1 transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify QR</span>
                        </Link>
                      )}
                    </div>

                    <button
                      onClick={() => handleDownloadPdf(rx.id, rx.prescription_number)}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Official PDF</span>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900">Hospital Medical History Timeline</h3>
            <p className="text-xs text-slate-500">Verified consultation and clinical diagnosis log at Sanjeevan Hospital</p>
          </div>

          <div className="relative border-l-2 border-blue-200 ml-3 sm:ml-6 space-y-6 py-2">
            {(medical_history_summary || []).length === 0 ? (
              <p className="text-xs text-slate-500 ml-6">No previous medical entries recorded.</p>
            ) : (
              medical_history_summary.map((entry, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Dot */}
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white absolute -left-[8px] top-1 shadow-xs" />
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-blue-900">{entry.date}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {entry.department}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{entry.diagnosis || 'Outpatient Consultation'}</p>
                    <p className="text-xs text-slate-600">Attending Doctor: <span className="font-semibold">{entry.doctor}</span></p>
                    {entry.tests_recommended && (
                      <p className="text-xs text-amber-700 font-medium">Recommended Tests: {entry.tests_recommended}</p>
                    )}
                    {entry.follow_up_date && (
                      <p className="text-xs text-slate-500">Follow-up: {entry.follow_up_date}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- TAB 4: APPOINTMENTS --- */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Consultations & Appointments</h3>
              <p className="text-xs text-slate-500">Scheduled outpatient appointments and token check-ins</p>
            </div>
            <Link
              to="/book-appointment"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book New Slot</span>
            </Link>
          </div>

          {(appointments || []).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">No appointments found.</p>
              <Link to="/book-appointment" className="text-xs font-bold text-blue-600 mt-2 inline-block">
                Book your first consultation →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {appt.appointment_code}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        appt.status === 'booked'
                          ? 'bg-amber-100 text-amber-800'
                          : appt.status === 'checked_in'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{appt.doctor_name || 'Specialist'}</h4>
                    <p className="text-xs text-slate-500">{appt.department_name} • Room: {appt.room || 'OPD'}</p>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Slot: <strong className="text-slate-800">{new Date(appt.slot_time).toLocaleString()}</strong></span>
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
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-blue-400/30 relative overflow-hidden space-y-5">
            {/* Seal Watermark */}
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-6 h-6 text-cyan-300" />
                <span className="text-sm font-black uppercase tracking-wider">Sanjeevan Hospital</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Digital Health ID
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                <User className="w-8 h-8 text-cyan-200" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">{patient.name}</h3>
                <p className="text-xs text-blue-200 font-mono tracking-wider font-bold">UHID: {patient.uhid}</p>
                <p className="text-xs text-slate-300">{patient.age} Yrs • {patient.gender?.toUpperCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-xs">
              <div>
                <span className="text-[10px] text-blue-300 uppercase font-semibold">Blood Group</span>
                <p className="font-bold text-rose-300">{patient.blood_group || 'B+'}</p>
              </div>
              <div>
                <span className="text-[10px] text-blue-300 uppercase font-semibold">Emergency Contact</span>
                <p className="font-bold text-white">+91 {patient.phone}</p>
              </div>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Sanjeevan 24x7 Casualty Desk:</span>
              <span className="text-xs font-mono font-bold text-cyan-300">+91 95526 25262</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            Present this digital health card at any Sanjeevan Hospital reception counter for instant check-in.
          </p>
        </div>
      )}

      {/* MODAL: VIEW PRESCRIPTION DETAILS */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                  {selectedRx.prescription_number}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Prescription Details</h3>
              </div>
              <button
                onClick={() => setSelectedRx(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Attending Doctor</span>
                <p className="font-bold text-slate-800 text-sm">{selectedRx.doctor_name}</p>
                <p className="text-slate-500">{selectedRx.doctor_specialization} • Cabin {selectedRx.doctor_room}</p>
                <p className="text-slate-400">Reg: {selectedRx.doctor_registration || 'MMC'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Consultation Date</span>
                <p className="font-bold text-slate-800 text-sm">
                  {selectedRx.created_at ? new Date(selectedRx.created_at).toLocaleDateString() : 'Today'}
                </p>
                <p className="text-slate-500">Department: {selectedRx.department_name}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Diagnosis</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedRx.diagnosis}</p>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescribed Medicines</span>
              <div className="mt-2 space-y-2">
                {(selectedRx.medicines || []).map((m, idx) => (
                  <div key={idx} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div>
                      <strong className="text-slate-900 font-bold text-sm">{m.name}</strong>
                      <p className="text-slate-500">{m.instructions}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="font-semibold text-blue-700">{m.dosage}</span> • <span className="font-semibold">{m.frequency}</span> ({m.duration})
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedRx.clinical_notes && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doctor's Advice</span>
                <p className="text-xs text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-200/60 mt-1">
                  {selectedRx.clinical_notes}
                </p>
              </div>
            )}

            {selectedRx.tests_recommended && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Tests</span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-1">
                  {selectedRx.tests_recommended}
                </p>
              </div>
            )}

            {/* Signature Hash */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clinically Signed by {selectedRx.doctor_name}</span>
                </span>
                <p className="text-[10px] font-mono text-emerald-700 mt-0.5 truncate max-w-sm">
                  {selectedRx.signature_hash}
                </p>
              </div>
              {selectedRx.verification_token && (
                <Link
                  to={`/verify-rx/${selectedRx.verification_token}`}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0"
                >
                  Verify QR
                </Link>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedRx.id, selectedRx.prescription_number)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Signed PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT HEALTH PROFILE */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Update Health Profile</h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Blood Group</label>
              <select
                value={editBloodGroup}
                onChange={(e) => setEditBloodGroup(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
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
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Known Allergies</label>
              <input
                type="text"
                value={editAllergies}
                onChange={(e) => setEditAllergies(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa, Dust, None"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Medical Conditions</label>
              <textarea
                value={editMedicalHistory}
                onChange={(e) => setEditMedicalHistory(e.target.value)}
                rows={3}
                placeholder="e.g. Hypertension, Diabetes, Asthma"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
