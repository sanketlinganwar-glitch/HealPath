import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Search,
  Monitor,
  Users,
  Clock,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function LandingPage() {
  const [lookupPhone, setLookupPhone] = useState('');
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handlePhoneLookup = (e) => {
    e.preventDefault();
    if (lookupPhone.trim().length === 10) {
      navigate(`/patient/lookup?phone=${lookupPhone.trim()}`);
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 rounded-b-3xl sm:rounded-b-[40px] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_50%)] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs sm:text-sm font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Smart Token & Hospital Queue Management</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Healthcare Without the <span className="bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">Endless Waiting</span>
          </h1>

          <p className="text-sm sm:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed">
            Generate digital OPD tokens, monitor your live turn from anywhere, receive WhatsApp updates, and enable hospital staff to organize patient flow effortlessly.
          </p>

          {/* Quick Find My Token Search Bar */}
          <form
            onSubmit={handlePhoneLookup}
            className="max-w-md mx-auto flex items-center bg-white p-1.5 rounded-2xl shadow-xl border border-blue-200/40 text-slate-800"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 10-digit mobile number..."
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={lookupPhone.length !== 10}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs"
            >
              {t('trackToken')}
            </button>
          </form>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/patient"
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-cyan-500/25 flex items-center space-x-2 transition transform hover:-translate-y-0.5"
            >
              <Ticket className="w-5 h-5" />
              <span>{t('bookAppointment')}</span>
            </Link>
            <Link
              to="/display"
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base rounded-xl border border-white/20 backdrop-blur-md flex items-center space-x-2 transition"
            >
              <Monitor className="w-5 h-5 text-cyan-300" />
              <span>{t('displayBoard')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Role Portals (Wireframe Architecture) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Integrated Hospital Management Modules
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Role-based interfaces designed for smooth patient experience and staff productivity
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Module 1: Patient */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">Patient Module</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Register for OPD, choose department with AI triage support, track live wait times, and reschedule your turn if delayed.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600 mb-5">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Instant digital token generation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Live turn & queue estimation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Multilingual AI assistant (En/Hi/Mr)</span>
                </li>
              </ul>
            </div>
            <Link
              to="/patient"
              className="w-full py-2.5 px-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-blue-600 hover:text-white transition"
            >
              <span>Get Token / Track</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Module 2: Receptionist */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">Receptionist Desk</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Manage live department queues, register walk-in patients, adjust priorities for emergencies, and handle no-shows.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600 mb-5">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Department queue tabs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mark emergency & senior priority</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Skip and requeue controls</span>
                </li>
              </ul>
            </div>
            <Link
              to="/reception"
              className="w-full py-2.5 px-3 rounded-xl bg-cyan-50 text-cyan-700 font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-cyan-600 hover:text-white transition"
            >
              <span>Reception Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Module 3: Doctor */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">Doctor Console</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Consultation screen for OPD doctors. 1-click 'Call Next', review patient symptoms, and conclude consultation.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600 mb-5">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Single-click Call Next</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Automatic room arrival notification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Next 3 patients in queue preview</span>
                </li>
              </ul>
            </div>
            <Link
              to="/doctor"
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-indigo-600 hover:text-white transition"
            >
              <span>Doctor Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Module 4: Admin & Display */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">Admin & Analytics</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Hospital administration oversight, doctor availability toggles, hourly throughput statistics, and OT schedules.
              </p>
              <ul className="text-xs space-y-1.5 text-slate-600 mb-5">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>KPI summary & activity reports</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Doctor on/off duty controls</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Operation Theatre (OT) timetable</span>
                </li>
              </ul>
            </div>
            <Link
              to="/admin"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-xs flex items-center justify-center space-x-1 hover:bg-emerald-600 hover:text-white transition"
            >
              <span>Admin Panel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights: What makes HealPath different */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800">
          <div className="max-w-2xl mb-8">
            <span className="text-cyan-400 font-bold uppercase tracking-wider text-xs">
              Why HealPath Stands Out
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
              Engineered for Real Indian Hospitals & Crowded OPDs
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
              <Clock className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Dynamic Rolling ETA</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Wait times are calculated using the rolling average of the last 10 completed consultations and active doctor counts, not static guesswork.
              </p>
            </div>

            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
              <Sparkles className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">AI Triage & Voice Bot</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gemini-powered triage suggests appropriate departments for patient symptoms, and voice recognition assists non-tech-savvy patients in Marathi and Hindi.
              </p>
            </div>

            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xs">
              <PhoneCall className="w-8 h-8 text-cyan-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">WhatsApp & Near-Turn Alerts</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Patients receive automatic system notifications when within 2 turns of consultation, with one-click WhatsApp sharing for family caregivers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
