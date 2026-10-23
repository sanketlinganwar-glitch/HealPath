import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  Calendar,
  Clock,
  Printer,
  FileText,
  ToggleLeft,
  ToggleRight,
  Stethoscope,
  Scissors,
  CheckCircle2
} from 'lucide-react';
import {
  getStats,
  getDoctors,
  getAppointments,
  getOTSchedule,
  updateDoctorStatus
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [otSchedule, setOtSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [s, d, a, ot] = await Promise.all([
        getStats(),
        getDoctors(),
        getAppointments(),
        getOTSchedule()
      ]);
      setStats(s);
      setDoctors(d);
      setAppointments(a);
      setOtSchedule(ot);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchAdminData, 6000);

  const handleToggleDoctorStatus = async (doctor) => {
    const newStatus = doctor.status === 'off' ? 'available' : 'off';
    try {
      await updateDoctorStatus(doctor.id, newStatus);
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            <span>Hospital Administration & Operations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System metrics, OPD throughput, staff duty rosters, and OT schedule
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintReport}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Daily Report</span>
        </button>
      </div>

      {/* KPI Cards (Wireframe 2) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total OPD Tokens
          </span>
          <span className="text-3xl font-black text-slate-900">
            {stats?.total_tokens || 0}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Generated today</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Completed Consultations
          </span>
          <span className="text-3xl font-black text-emerald-600">
            {stats?.completed || 0}
          </span>
          <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
            Avg Duration: {stats?.avg_consult_min || 8} min
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Active Waiting Queue
          </span>
          <span className="text-3xl font-black text-amber-600">
            {stats?.waiting || 0}
          </span>
          <p className="text-[11px] text-amber-700 mt-1 font-semibold">
            Avg Wait: {stats?.avg_wait_min || 0} min
          </p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Active Doctors on Duty
          </span>
          <span className="text-3xl font-black text-blue-600">
            {doctors.filter((d) => d.status !== 'off').length} / {doctors.length}
          </span>
          <p className="text-[11px] text-blue-700 mt-1 font-semibold">5 OPD Departments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Department Analytics
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'doctors'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff & Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'appointments'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Appointments ({appointments.length})
        </button>
        <button
          onClick={() => setActiveTab('ot')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'ot'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          OT Schedule ({otSchedule.length})
        </button>
      </div>

      {/* Tab 1: Department Analytics */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Department Performance Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Waiting</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Avg Wait Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.by_department?.map((d) => (
                  <tr key={d.department_id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.department_name}</td>
                    <td className="py-3 px-4 font-semibold text-amber-600">{d.waiting} patients</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{d.completed} patients</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{d.avg_wait_min}m</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                        Operational
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Doctor On/Off Toggle Management */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Doctor Roster & OPD Room Duty</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900">{doc.name}</div>
                  <div className="text-xs text-slate-500">
                    {doc.specialization} • {doc.department_name}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-700">{doc.room}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold capitalize ${doc.status === 'off' ? 'text-slate-400' : 'text-emerald-700'}`}>
                    {doc.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleDoctorStatus(doc)}
                    className="p-1 text-blue-600 hover:text-blue-800 transition"
                    title="Toggle Available / Off"
                  >
                    {doc.status === 'off' ? (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    ) : (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Scheduled Outpatient Appointments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((ap) => (
                  <tr key={ap.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{ap.patient?.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{ap.patient?.phone}</td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {new Date(ap.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ap.status === 'checked_in'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {ap.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: OT Schedule */}
      {activeTab === 'ot' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Scissors className="w-4 h-4 text-rose-600" />
            <span>Operation Theatre (OT) Live Board</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otSchedule.map((ot) => (
              <div key={ot.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-800">{ot.theatre}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    ot.status === 'Completed'
                      ? 'bg-slate-200 text-slate-700'
                      : ot.status === 'In Progress'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {ot.status}
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-900">{ot.procedure}</div>
                <div className="text-xs text-slate-500">Lead Surgeon: {ot.surgeon}</div>
                <div className="text-[11px] text-slate-400 font-semibold pt-1">
                  {new Date(ot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
