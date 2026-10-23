import React, { useState } from 'react';
import { Sparkles, RotateCcw, Users, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { demoReset, demoSimulate, showToast } from '../api/client';

export function DemoControlsPage() {
  const [resetting, setResetting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simCount, setSimCount] = useState(5);
  const [lastActionMsg, setLastActionMsg] = useState('');

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await demoReset();
      setLastActionMsg(`Success: Clean database re-seeded with ${res.tokens} sample tokens & doctors.`);
      showToast('Database reset and re-seeded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Reset failed.', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await demoSimulate(simCount);
      setLastActionMsg(`Traffic added: Injected ${res.added} realistic waiting patients across OPDs.`);
      showToast(`Added ${res.added} random waiting patients!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Simulation failed.', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Hackathon Demo Controls</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Live Prototype Simulation & Data Reset
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Test real-time queue reactivity, auto-refresh polling, and role workflows during your demonstration.
        </p>
      </div>

      {lastActionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-xs font-bold text-emerald-900 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{lastActionMsg}</span>
        </div>
      )}

      {/* Control Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Card 1: Reset */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset Sample Database</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clears all live modifications and re-populates 5 departments, 10 doctors, 15 realistic tokens with valid consult times, 4 OT slots, and default users.
            </p>
          </div>

          <button
            type="button"
            disabled={resetting}
            onClick={handleReset}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            {resetting ? 'Resetting Data...' : 'Wipe & Re-Seed Database'}
          </button>
        </div>

        {/* Card 2: Simulate Traffic */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Simulate Queue Influx</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instantly injects random waiting patients with symptoms and priority categories to demonstrate live 5-second queue updates on the TV board.
            </p>
            <div className="flex items-center space-x-2 pt-2">
              <label className="text-xs font-bold text-slate-600">Count:</label>
              <select
                value={simCount}
                onChange={(e) => setSimCount(parseInt(e.target.value, 10))}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
              >
                <option value={3}>3 Patients</option>
                <option value={5}>5 Patients</option>
                <option value={10}>10 Patients</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={simulating}
            onClick={handleSimulate}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            {simulating ? 'Injecting Traffic...' : `Add ${simCount} Random Patients`}
          </button>
        </div>
      </div>

      {/* Quick Links for Judges */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Demo Workflow Links (Click to Test)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
          <a
            href="#/patient"
            className="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-blue-700 flex items-center justify-between transition"
          >
            <span>Patient Reg</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="#/display"
            className="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-blue-700 flex items-center justify-between transition"
          >
            <span>TV Display</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="#/reception"
            className="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-blue-700 flex items-center justify-between transition"
          >
            <span>Reception Desk</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="#/doctor"
            className="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-blue-700 flex items-center justify-between transition"
          >
            <span>Doctor Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
