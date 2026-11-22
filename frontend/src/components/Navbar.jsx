import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  LogIn,
  LogOut,
  Monitor,
  UserCheck,
  Stethoscope,
  Globe,
  Sparkles,
  Calendar,
  WifiOff,
  Mic,
  HeartPulse,
  PhoneCall,
  MapPin,
  Menu,
  X,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-900 px-4 py-1 text-xs font-semibold flex items-center justify-center space-x-2 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode Active — changes are cached and will sync automatically.</span>
        </div>
      )}

      {/* Top Clinical Utility Bar (Apollo-inspired) */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="hidden sm:flex items-center space-x-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              <span>Sanjeevan Hospital & Research Institute, Yavatmal (445001)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-300 font-semibold">
              <PhoneCall className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Emergency 24/7: <strong>+91 95526 25262</strong></span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* OPD Timings */}
            <span className="hidden md:flex items-center space-x-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>OPD: Mon–Sat 9:00 AM – 6:00 PM</span>
            </span>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  lang === 'en' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  lang === 'hi' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Hindi"
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLang('mr')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  lang === 'mr' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Marathi"
              >
                मराठी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Hospital Logo & Identity */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Sanjeevan<span className="text-teal-600">Care</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  HealPath
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium tracking-tight -mt-0.5 hidden sm:block">
                Multispecialty Hospital & Research Institute, Yavatmal
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <Link
              to="/"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors touch-target ${
                isActive('/') ? 'text-teal-700 bg-teal-50/80 font-bold' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-50'
              }`}
            >
              {t('home') || 'Home'}
            </Link>

            <Link
              to="/doctors-info"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors flex items-center space-x-1.5 touch-target ${
                isActive('/doctors-info') ? 'text-teal-700 bg-teal-50/80 font-bold' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-50'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>{t('findDoctor') || 'Find a Doctor'}</span>
            </Link>

            <Link
              to="/book-appointment"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors flex items-center space-x-1.5 touch-target ${
                isActive('/book-appointment') ? 'text-teal-700 bg-teal-50/80 font-bold' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{t('bookAppointment') || 'Book Appointment'}</span>
            </Link>

            <Link
              to="/patient/dashboard"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors flex items-center space-x-1.5 touch-target ${
                isActive('/patient/dashboard') ? 'text-teal-700 bg-teal-50/80 font-bold' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-50'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-teal-600" />
              <span>{t('healthWallet') || 'Health Wallet'}</span>
            </Link>

            <Link
              to="/voice"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors flex items-center space-x-1.5 touch-target ${
                isActive('/voice') ? 'text-purple-700 bg-purple-50 font-bold' : 'text-slate-700 hover:text-purple-700 hover:bg-slate-50'
              }`}
            >
              <Mic className="w-4 h-4 text-purple-600" />
              <span>{t('voiceAssistantTitle') || 'Voice Assistant'}</span>
            </Link>

            <Link
              to="/display"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors flex items-center space-x-1.5 touch-target ${
                isActive('/display') ? 'text-teal-700 bg-teal-50/80 font-bold' : 'text-slate-700 hover:text-teal-700 hover:bg-slate-50'
              }`}
            >
              <Monitor className="w-4 h-4 text-slate-500" />
              <span>{t('displayBoard') || 'Queue Board'}</span>
            </Link>
          </nav>

          {/* Right Action: Auth / User Menu */}
          <div className="hidden lg:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {user?.name || 'Authenticated User'}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-teal-600 tracking-wider">
                    {user?.role === 'patient' ? `UHID: ${user?.uhid || 'Verified'}` : user?.role}
                  </span>
                </div>

                {user?.role === 'patient' ? (
                  <Link
                    to="/patient/dashboard"
                    className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition"
                    title="Health Wallet"
                  >
                    <HeartPulse className="w-5 h-5" />
                  </Link>
                ) : (
                  <Link
                    to={user?.role === 'doctor' ? '/doctor' : user?.role === 'admin' ? '/admin' : '/reception'}
                    className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition"
                    title="Staff Portal"
                  >
                    <UserCheck className="w-5 h-5" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-xl text-xs xl:text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 flex items-center space-x-2 transition transform hover:-translate-y-0.5 touch-target"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('patientLogin') || 'Patient Portal'}</span>
                </Link>
                <Link
                  to="/login"
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-teal-700 hover:bg-slate-100 border border-slate-200 transition touch-target"
                >
                  <span>Staff</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition touch-target"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fadeIn">
          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-5 h-5 text-teal-600" />
              <span>{t('home') || 'Home'}</span>
            </Link>

            <Link
              to="/doctors-info"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/doctors-info') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <span>{t('findDoctor') || 'Find a Doctor'}</span>
            </Link>

            <Link
              to="/book-appointment"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/book-appointment') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>{t('bookAppointment') || 'Book Appointment'}</span>
            </Link>

            <Link
              to="/patient/dashboard"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/patient/dashboard') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HeartPulse className="w-5 h-5 text-teal-600" />
              <span>{t('healthWallet') || 'Health Wallet'}</span>
            </Link>

            <Link
              to="/patient"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/patient') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-5 h-5 text-cyan-600" />
              <span>{t('patientModule') || 'OPD Token Registration'}</span>
            </Link>

            <Link
              to="/voice"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/voice') ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Mic className="w-5 h-5 text-purple-600" />
              <span>{t('voiceAssistantTitle') || 'Voice Assistant'}</span>
            </Link>

            <Link
              to="/display"
              className={`px-3.5 py-3 rounded-xl text-sm font-semibold flex items-center space-x-3 ${
                isActive('/display') ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Monitor className="w-5 h-5 text-slate-500" />
              <span>{t('displayBoard') || 'Queue Board'}</span>
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[10px] text-teal-600 font-semibold uppercase">{user?.role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl text-xs font-bold text-center text-white bg-teal-600 shadow-md touch-target"
                >
                  Patient Login
                </Link>
                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl text-xs font-bold text-center text-slate-700 bg-slate-100 border border-slate-200 touch-target"
                >
                  Staff Login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
