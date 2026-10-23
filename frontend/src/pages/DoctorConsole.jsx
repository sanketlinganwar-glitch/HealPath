import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  User,
  Phone,
  Clock,
  CheckCircle2,
  PhoneCall,
  Users,
  AlertTriangle,
  PlayCircle,
  Activity,
  ArrowRight
} from 'lucide-react';
import { getDoctorCurrent, callNext, completeToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';

export function DoctorConsole() {
  const { user } = useAuth();
  const doctorId = user?.doctor_id || 1; // Default to Dr. Rajesh Sharma if admin viewing
  const [consoleData, setConsoleData] = useState(null);
  const [calling, setCalling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConsole = async () => {
    try {
      const data = await getDoctorCurrent(doctorId);
      setConsoleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5s
  usePolling(fetchConsole, 5000);

  const handleCallNext = async () => {
    setCalling(true);
    try {
      await callNext(doctorId);
      fetchConsole();
    } catch (err) {
      console.error(err);
    } finally {
      setCalling(false);
    }
  };

  const handleComplete = async (tokenId) => {
    setCompleting(true);
    try {
      await completeToken(tokenId);
      fetchConsole();
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading && !consoleData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Activity className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Connecting to Doctor OPD console...</p>
      </div>
    );
  }

  const doctor = consoleData?.doctor;
  const currentToken = consoleData?.current;
  const nextUp = consoleData?.next_up || [];
  const waitingCount = consoleData?.waiting_count || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Doctor Profile Banner (Wireframe 6) */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Stethoscope className="w-8 h-8 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">{doctor?.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                doctor?.status === 'busy'
                  ? 'bg-amber-400 text-amber-950'
                  : doctor?.status === 'available'
                  ? 'bg-emerald-400 text-emerald-950'
                  : 'bg-slate-400 text-slate-950'
              }`}>
                {doctor?.status}
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              {doctor?.specialization} • {doctor?.department_name} ({doctor?.room})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-center">
          <div className="px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-xs">
            <span className="text-[11px] text-blue-200 block uppercase font-bold">OPD Waiting</span>
            <span className="text-2xl font-black text-cyan-300">{waitingCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Center Column: Active Consultation (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {currentToken ? (
            /* Current Patient in Consultation */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-lg space-y-6 animate-scale-up">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                    Current Patient in Consultation
                  </span>
                </div>
                <span className="font-mono font-black text-2xl text-emerald-700">
                  {currentToken.token_number}
                </span>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Patient Name & Age
                  </span>
                  <div className="text-base font-extrabold text-slate-900">
                    {currentToken.patient?.name}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">
                    {currentToken.patient?.gender}, {currentToken.patient?.age} Years
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone & Priority
                  </span>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {currentToken.patient?.phone}
                  </div>
                  <div className="text-xs font-semibold capitalize text-blue-700">
                    Priority: {currentToken.priority}
                  </div>
                </div>
              </div>

              {/* Symptoms */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Reported Symptoms / Reason
                </span>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {currentToken.symptoms || 'No specific symptoms noted.'}
                </p>
              </div>

              {/* Finish Consultation Button */}
              <button
                type="button"
                disabled={completing}
                onClick={() => handleComplete(currentToken.id)}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{completing ? 'Completing...' : 'Complete Consultation'}</span>
              </button>
            </div>
          ) : (
            /* No Active Consultation: Call Next Patient Card */
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Consultation Room Available</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {waitingCount > 0
                    ? `There are ${waitingCount} patient(s) waiting in ${doctor?.department_name}.`
                    : 'No patients waiting in queue right now.'}
                </p>
              </div>

              <button
                type="button"
                disabled={calling || waitingCount === 0}
                onClick={handleCallNext}
                className="px-8 py-4 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 disabled:opacity-40 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-blue-600/25 inline-flex items-center space-x-3 transition transform hover:scale-102"
              >
                <PlayCircle className="w-6 h-6" />
                <span>{calling ? 'Calling Patient...' : 'Call Next Patient'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Next Up Queue Preview (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Next Up in Line</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{nextUp.length} next</span>
          </div>

          {nextUp.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              No upcoming patients in queue.
            </p>
          ) : (
            <div className="space-y-3">
              {nextUp.map((token, idx) => (
                <div
                  key={token.id}
                  className="p-3.5 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200/60 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-blue-700">
                      {token.token_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      token.priority === 'emergency'
                        ? 'bg-rose-100 text-rose-800'
                        : token.priority === 'senior'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {token.priority}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    {token.patient?.name} ({token.patient?.age}y)
                  </div>
                  {token.symptoms && (
                    <p className="text-[11px] text-slate-500 truncate">{token.symptoms}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
