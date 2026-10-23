import React from 'react';
import { Activity, ShieldAlert, Heart, Github } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pb-6 border-b border-slate-800">
          {/* Col 1: Project Identity */}
          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-base mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span>HealPath</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Smart Digital Hospital Token & Queue Management System. Built to eliminate long physical waiting queues, provide real-time patient visibility, and streamline staff workflows.
            </p>
            <div className="mt-3 text-xs text-slate-500">
              Developed by <strong className="text-slate-300">Team BuildBridge</strong> for <strong className="text-blue-400">GCOEY Hack-Bite</strong>.
            </div>
          </div>

          {/* Col 2: Navigation & GitHub */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-2.5">
              Quick Links & Repository
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a href="#/patient" className="hover:text-blue-400 transition">
                  Patient Registration & Tracking
                </a>
              </li>
              <li>
                <a href="#/display" className="hover:text-blue-400 transition">
                  Live TV Waiting Hall Display
                </a>
              </li>
              <li>
                <a href="#/doctors-info" className="hover:text-blue-400 transition">
                  Doctors & OPD Schedules
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sanketlinganwar-glitch/HealPath.git"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-blue-400 hover:text-blue-300 pt-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository (HealPath)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Medical Disclaimer */}
          <div>
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Medical Safety Notice</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              {t('disclaimer')}
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© 2026 HealPath (QueueCare). All rights reserved.</p>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Improving healthcare delivery with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            <span>in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
