import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User, Key, ArrowRight, ShieldCheck, HeartPulse, Phone, QrCode, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function LoginPage() {
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' | 'staff'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('9876543210');
  const [pin, setPin] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, patientLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const userData = await login(username.trim(), password.trim());
      if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'receptionist') {
        navigate('/reception');
      } else if (userData.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await patientLogin(cleanPhone, pin);
      navigate('/patient/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Patient login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const autoFillStaff = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  const autoFillPatient = (p) => {
    setPhone(p);
    setPin('1234');
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Sanjeevan Hospital Portal
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('patient'); setErrorMsg(''); }}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 touch-target ${
              activeTab === 'patient'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Health Wallet</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setErrorMsg(''); }}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 touch-target ${
              activeTab === 'staff'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Staff Portal</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl animate-shake">
            {errorMsg}
          </div>
        )}

        {/* TAB 1: PATIENT HEALTH WALLET LOGIN */}
        {activeTab === 'patient' ? (
          <form onSubmit={handlePatientLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mobile Number (Registered)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-teal-600" />
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Access PIN / OTP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4 text-teal-600" />
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Default PIN: 1234"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition shadow-md shadow-teal-600/30 flex items-center justify-center space-x-2 touch-target"
            >
              {loading ? (
                <span>Authenticating Patient...</span>
              ) : (
                <>
                  <HeartPulse className="w-4 h-4" />
                  <span>Access Health Wallet</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Demo Quick Fill for Registered Patients */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">
                One-Click Registered Patients (Demo)
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => autoFillPatient('9876543210')}
                  className="p-1.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition"
                >
                  Ramesh (General)
                </button>
                <button
                  type="button"
                  onClick={() => autoFillPatient('9876543211')}
                  className="p-1.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition"
                >
                  Govind (Ortho)
                </button>
                <button
                  type="button"
                  onClick={() => autoFillPatient('9876543213')}
                  className="p-1.5 bg-slate-50 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition"
                >
                  Balkrishna (Senior)
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* TAB 2: HOSPITAL STAFF LOGIN */
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Staff Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-teal-600" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, receptionist, doctor1"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4 text-teal-600" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center space-x-2 touch-target"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In as Staff</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Quick Demo Pre-fill for Testing */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">
                Staff Quick Fill (Demo)
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => autoFillStaff('admin', 'admin123')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => autoFillStaff('receptionist', 'reception123')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition"
                >
                  Reception
                </button>
                <button
                  type="button"
                  onClick={() => autoFillStaff('doctor1', 'doctor123')}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-center transition"
                >
                  Dr. Rajesh
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="pt-2 flex items-center justify-center space-x-1 text-slate-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>PBKDF2-SHA256 & DPDP Act 2023 Compliant</span>
        </div>
      </div>
    </div>
  );
}
