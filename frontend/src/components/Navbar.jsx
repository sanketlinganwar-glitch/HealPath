import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogIn, LogOut, Monitor, UserCheck, Stethoscope, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                  HealPath
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Smart Care
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5 hidden sm:block">
                Hospital Queue & Staff Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <Link
              to="/patient"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors"
            >
              {t('patientModule')}
            </Link>
            <Link
              to="/display"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors flex items-center space-x-1.5"
            >
              <Monitor className="w-4 h-4 text-blue-600" />
              <span>{t('displayBoard')}</span>
            </Link>
            <Link
              to="/doctors-info"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/80 transition-colors flex items-center space-x-1.5"
            >
              <Stethoscope className="w-4 h-4 text-slate-500" />
              <span>{t('doctorsInfo')}</span>
            </Link>
            <Link
              to="/demo"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo</span>
            </Link>
          </nav>

          {/* Right Action: Language Switcher & Auth */}
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === 'en' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === 'hi' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLang('mr')}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === 'mr' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                मराठी
              </button>
            </div>

            {/* Auth Button / Role Badge */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={user?.role === 'admin' ? '/admin' : user?.role === 'receptionist' ? '/reception' : '/doctor'}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 hover:bg-blue-100 transition"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="capitalize">{user?.role}</span>: <span className="font-normal truncate max-w-[100px]">{user?.name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
              >
                <LogIn className="w-4 h-4" />
                <span>{t('staffLogin')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
