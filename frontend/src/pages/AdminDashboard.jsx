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
  CheckCircle2,
  Building2,
  Search,
  Filter
} from 'lucide-react';
import {
  getStats,
  getDoctors,
  getAppointments,
  getOTSchedule,
  updateDoctorStatus,
  showToast
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [otSchedule, setOtSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorSearch, setDoctorSearch] = useState('');

  const fetchAdminData = async () => {
    try {
      const [s, d, a, ot] = await Promise.all([
        getStats(),
        getDoctors(),
        getAppointments(),
        getOTSchedule()
      ]);
      setStats(s);
      setDoctors(d || []);
      setAppointments(a || []);
      setOtSchedule(ot || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  usePolling(fetchAdminData, 6000);

  const handleToggleDoctorStatus = async (doctor) => {
    const newStatus = doctor.status === 'off' ? 'available' : 'off';
    try {
      await updateDoctorStatus(doctor.id, newStatus);
      showToast(`${doctor.name} is now ${newStatus}`, 'success');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast('Failed to update doctor status', 'error');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.department_name?.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hospital Operations Administration
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time OPD throughput, staff duty rosters, departments, and OT scheduling
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrintReport}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Daily Summary</span>
        </button>
      </div>

      {/* Printable Report Title (Only visible in Print) */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-xl font-bold">
          Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
        </h1>
        <p className="text-xs text-slate-600">Daily Operations & OPD Roster Report &bull; {new Date().toLocaleDateString()}</p>
      </div>

      {/* Responsive KPI Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total OPD Tokens
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {stats?.total_tokens || 0}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Generated today</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Completed Consults
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {stats?.completed || 0}
            </span>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
              Avg Duration: {stats?.avg_consult_min || 8} min
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Waiting in Queue
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600">
              {stats?.waiting || 0}
            </span>
            <p className="text-[11px] text-amber-700 mt-1 font-semibold">
              Avg Wait: {stats?.avg_wait_min || 0} min
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Doctors on Duty
            </span>
            <span className="text-2xl sm:text-3xl font-black text-blue-600">
              {doctors.filter((d) => d.status !== 'off').length} / {doctors.length}
            </span>
            <p className="text-[11px] text-blue-700 mt-1 font-semibold">
              {stats?.by_department?.length || 5} Departments Active
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Responsive Navigation Tabs (Horizontal Scroll on Mobile) */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none -mx-2 px-2 text-xs sm:text-sm font-bold print:hidden">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Department Analytics
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'doctors'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff & Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
            activeTab === 'appointments'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Appointments ({appointments.length})
        </button>
        <button
          onClick={() => setActiveTab('ot')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex-shrink-0 ${
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
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Department Performance Breakdown
            </h3>
            <span className="text-xs text-slate-500">Live OPD Metrics</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[550px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Waiting</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Avg Wait</th>
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

          {/* Mobile Cards View */}
          <div className="block sm:hidden space-y-3">
            {stats?.by_department?.map((d) => (
              <div
                key={d.department_id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900">{d.department_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-800">
                    Operational
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold">Waiting</span>
                    <span className="font-extrabold text-amber-600">{d.waiting}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold">Done</span>
                    <span className="font-extrabold text-emerald-600">{d.completed}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold">Avg Wait</span>
                    <span className="font-extrabold text-slate-700">{d.avg_wait_min}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Doctor On/Off Toggle Management */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Doctor Roster & OPD Room Duty
              </h3>
              <p className="text-xs text-slate-500">
                Manage doctor availability, active rooms, and duty status
              </p>
            </div>

            {/* Doctor Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search doctor or specialty..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between hover:border-slate-300 transition"
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">{doc.name}</div>
                  <div className="text-xs text-slate-500">
                    {doc.specialization} &bull; {doc.department_name}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {doc.room}
                    </span>
                    <span className="text-slate-400">
                      {doc.shift_start ? `${doc.shift_start} - ${doc.shift_end}` : 'OPD Shift'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold capitalize ${
                      doc.status === 'off' ? 'text-slate-400' : 'text-emerald-700'
                    }`}
                  >
                    {doc.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleDoctorStatus(doc)}
                    className="p-1 text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    title={`Click to mark ${doc.status === 'off' ? 'Available' : 'Off Duty'}`}
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

            {filteredDoctors.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No doctors found matching &ldquo;{doctorSearch}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Scheduled Outpatient Appointments
            </h3>
            <span className="text-xs text-slate-500">{appointments.length} Total</span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[550px]">
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
                      {new Date(ap.slot_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ap.status === 'checked_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ap.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-2.5">
            {appointments.map((ap) => (
              <div
                key={ap.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{ap.patient?.name}</div>
                  <div className="text-xs text-slate-500">{ap.patient?.phone}</div>
                  <div className="text-xs font-semibold text-blue-700 mt-0.5">
                    {new Date(ap.slot_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    ap.status === 'checked_in'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {ap.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: OT Schedule */}
      {activeTab === 'ot' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Scissors className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Operation Theatre (OT) Live Board
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {otSchedule.map((ot) => (
              <div
                key={ot.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-800">{ot.theatre}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ot.status === 'Completed'
                        ? 'bg-slate-200 text-slate-700'
                        : ot.status === 'In Progress'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {ot.status}
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-900">{ot.procedure}</div>
                <div className="text-xs text-slate-500">Lead Surgeon: {ot.surgeon}</div>
                <div className="text-[11px] text-slate-400 font-semibold pt-1">
                  {new Date(ot.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  -{' '}
                  {new Date(ot.end_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
