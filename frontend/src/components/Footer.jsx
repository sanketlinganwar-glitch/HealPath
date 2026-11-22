import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldAlert,
  Heart,
  PhoneCall,
  MapPin,
  Clock,
  Mail,
  Stethoscope,
  Calendar,
  HeartPulse,
  Monitor,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 mt-auto text-xs sm:text-sm">
      {/* Emergency & Support Ribbon */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 border-b border-teal-800/40 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-rose-400">24/7 Critical Emergency & Trauma Care</p>
              <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">+91 95526 25262</h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/book-appointment"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-teal-900/40 flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
            <Link
              to="/patient/dashboard"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition flex items-center space-x-2"
            >
              <HeartPulse className="w-4 h-4 text-teal-400" />
              <span>Patient Health Wallet</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-slate-800">
          {/* Col 1: Hospital Identity */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5 text-white font-bold text-lg">
              <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-black tracking-tight text-white">Sanjeevan</span>
                <span className="text-teal-400">Care</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              <strong>Sanjeevan Multispecialty Hospital & Research Institute</strong> is Yavatmal's premier tertiary healthcare destination, combining clinical excellence, advanced diagnostics, and intelligent zero-wait patient flow systems.
            </p>
            <div className="pt-2 text-xs space-y-1 text-slate-400">
              <p className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>Mahadev Mandir Road, Ratanlal Plots, Yavatmal, Maharashtra 445001</span>
              </p>
              <p className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-teal-400 shrink-0" />
                <span>OPD: Mon – Sat (9:00 AM – 6:00 PM)</span>
              </p>
            </div>
          </div>

          {/* Col 2: Patient Portals & Services */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-l-2 border-teal-500 pl-2">
              Patient Services
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <Link to="/doctors-info" className="hover:text-teal-400 transition flex items-center space-x-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
                  <span>Find a Specialist Doctor</span>
                </Link>
              </li>
              <li>
                <Link to="/book-appointment" className="hover:text-teal-400 transition flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Online OPD Consultation Booking</span>
                </Link>
              </li>
              <li>
                <Link to="/patient/dashboard" className="hover:text-teal-400 transition flex items-center space-x-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-teal-400" />
                  <span>Digital Health Wallet & Records</span>
                </Link>
              </li>
              <li>
                <Link to="/patient" className="hover:text-teal-400 transition flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Digital OPD Token Registration</span>
                </Link>
              </li>
              <li>
                <Link to="/display" className="hover:text-teal-400 transition flex items-center space-x-1.5">
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                  <span>Lobby Smart TV Waiting Board</span>
                </Link>
              </li>
              <li>
                <Link to="/voice" className="hover:text-teal-400 transition flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                  <span>Trilingual Voice Assistant (mr/hi/en)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Medical Specialities */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-l-2 border-teal-500 pl-2">
              Key Specialities
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>General Medicine & Critical Care</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Cardiology & Non-Invasive Cardiac Lab</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Orthopedics & Joint Replacement</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Pediatrics, Neonatology & Maternal Health</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>ENT & Advanced Head-Neck Surgery</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                <span>Laparoscopic & General Surgery</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Clinical Governance & Privacy */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4 border-l-2 border-teal-500 pl-2">
              Clinical Safety & Privacy
            </h4>
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-1.5 text-teal-400 font-semibold text-xs">
                <Lock className="w-4 h-4" />
                <span>DPDP Act 2023 Compliant</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Patient records and public verification QR codes use zero-knowledge cryptographic hashes without disclosing diagnoses or medications.
              </p>
            </div>

            <div className="bg-amber-950/30 p-3.5 rounded-xl border border-amber-900/40 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Clinical Triage Notice</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                AI and voice assistants provide navigational triage and do not constitute a definitive medical diagnosis. In critical situations, contact +91 95526 25262 immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal. All rights reserved.</p>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Powered by HealPath (QueueCare) Smart Hospital Platform</span>
            <span>•</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>Dedicated to rural healthcare innovation</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
