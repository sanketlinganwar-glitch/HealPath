import React, { useState, useEffect } from 'react';
import { Monitor, Clock, Users, Activity, Volume2, AlertCircle } from 'lucide-react';
import { getDisplay } from '../api/client';
import { usePolling } from '../hooks/usePolling';

export function DisplayBoard() {
  const [displayData, setDisplayData] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchDisplay = async () => {
    try {
      const res = await getDisplay();
      setDisplayData(res.departments || []);
    } catch (err) {
      console.error(err);
    }
  };

  usePolling(fetchDisplay, 5000);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-between select-none">
      {/* TV Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-white bg-clip-text text-transparent">
              HealPath OPD Display Board
            </h1>
            <p className="text-xs text-slate-400 font-semibold tracking-wide">
              Live Consultation & Token Status for Waiting Areas
            </p>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center space-x-4 bg-slate-900/80 px-5 py-2.5 rounded-2xl border border-slate-800 shadow-inner">
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Departments */}
      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 my-6 flex-1">
        {displayData.map((dept) => (
          <div
            key={dept.department_id}
            className="bg-slate-900/90 rounded-3xl border border-slate-800/90 shadow-2xl p-6 flex flex-col justify-between space-y-5"
          >
            {/* Dept Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {dept.department_name}
                </h2>
                <span className="text-[11px] text-slate-400 font-bold">
                  {dept.waiting_count} Waiting • Est: ~{dept.est_wait_min}m
                </span>
              </div>
              <span className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 font-mono font-black flex items-center justify-center text-sm">
                {dept.department_name.charAt(0)}
              </span>
            </div>

            {/* Now Serving Big Highlight */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Now Serving</span>
              </span>

              {dept.now_serving && dept.now_serving.length > 0 ? (
                <div className="space-y-2">
                  {dept.now_serving.map((srv, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-300 tracking-tight">
                          {srv.token_number}
                        </div>
                        <div className="text-xs text-emerald-200/90 font-semibold mt-1">
                          {srv.doctor_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black uppercase text-slate-400 block tracking-wider">
                          Cabin
                        </span>
                        <span className="text-base font-extrabold text-white">
                          {srv.room}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-slate-400 text-sm font-semibold italic">
                  Cabin Available
                </div>
              )}
            </div>

            {/* Next Up Tokens */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Next In Line (Ready Near Room)
              </span>
              <div className="flex flex-wrap gap-2">
                {dept.next_up && dept.next_up.length > 0 ? (
                  dept.next_up.map((tokNum, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold shadow-xs ${
                        i === 0
                          ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {tokNum}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No waiting tokens</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Emergency Announcement Ticker */}
      <footer className="mt-4 p-3.5 bg-blue-950/60 rounded-2xl border border-blue-800/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-2">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase">
            Notice
          </span>
          <span>Please proceed to the assigned consultation room when your token is called.</span>
        </div>
        <div className="text-blue-300 font-semibold">
          Emergency Desk: Ground Floor (Room 001) • Ambulance: 112
        </div>
      </footer>
    </div>
  );
}
