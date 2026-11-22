import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User, Key, ArrowRight, ShieldCheck, HeartPulse, Phone, QrCode } from 'lucide-react';
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
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            HealPath Access Portal
          </h2>
          <p className="text-xs text-slate-500">
            Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setActiveTab('patient'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'patient'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-4 h-4 text-emerald-600" />
            <span>Health Wallet</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'staff'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Staff Portal</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* PATIENT LOGIN FORM */}
        {activeTab === 'patient' && (
          <form onSubmit={handlePatientLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('phoneNumber') || 'Mobile Number'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Security PIN / OTP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Default instant OTP for demo: 1234</p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition"
            >
              <span>{loading ? 'Verifying & Loading Wallet...' : 'Open Digital Health Wallet'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Patients */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Demo Patient Records
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => autoFillPatient('9876543210')}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200/60 transition truncate"
                  title="Ramesh Pawar (Cardiology)"
                >
                  Ramesh (Cards)
                </button>
                <button
                  type="button"
                  onClick={() => autoFillPatient('9899011111')}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200/60 transition truncate"
                  title="Govind Narang (Appointment)"
                >
                  Govind (Appt)
                </button>
                <button
                  type="button"
                  onClick={() => autoFillPatient('9811122233')}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200/60 transition truncate"
                  title="Balkrishna Gite (Senior)"
                >
                  Balkrishna (Sr)
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STAFF LOGIN FORM */}
        {activeTab === 'staff' && (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Staff Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, reception, doctor1"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Staff Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Staff */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Quick Demo Staff Roles
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => autoFillStaff('admin', 'admin123')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => autoFillStaff('reception', 'reception123')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Reception
                </button>
                <button
                  type="button"
                  onClick={() => autoFillStaff('doctor1', 'doctor123')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Dr. Sharma
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
