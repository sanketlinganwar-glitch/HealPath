import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Stethoscope,
  MapPin,
  CheckCircle,
  Clock,
  Search,
  Calendar,
  Filter,
  ShieldCheck,
  Award,
  ChevronRight,
  PhoneCall,
  Sparkles,
  Building2,
  Users
} from 'lucide-react';
import { getDepartments, getDoctors } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export function DoctorsInfoPage() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    // Check if URL contains query param for dept
    const params = new URLSearchParams(location.search);
    const deptParam = params.get('dept');
    if (deptParam) {
      setSelectedDept(deptParam);
    }

    Promise.all([getDepartments(), getDoctors()])
      .then(([depts, docs]) => {
        setDepartments(depts);
        setDoctors(docs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [location.search]);

  const filteredDoctors = doctors.filter((doc) => {
    const matchesDept = selectedDept === 'all' || doc.department_id === parseInt(selectedDept, 10);
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'available' && (doc.status === 'available' || doc.duty_status === 'available')) ||
      (selectedStatus === 'busy' && (doc.status === 'busy' || doc.duty_status === 'busy'));

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(searchLower) ||
      doc.specialization.toLowerCase().includes(searchLower) ||
      (doc.department_name && doc.department_name.toLowerCase().includes(searchLower)) ||
      (doc.qualification && doc.qualification.toLowerCase().includes(searchLower)) ||
      (doc.room && doc.room.toLowerCase().includes(searchLower));

    return matchesDept && matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
          <Award className="w-4 h-4 text-teal-600" />
          <span>Sanjeevan Hospital Verified Medical Faculty</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Find a Specialist Doctor
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Consult board-certified surgeons, physicians, and pediatric specialists at Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal.
        </p>
      </div>

      {/* Filter and Search Controller */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-4">
        {/* Search Input Row */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-teal-600" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by doctor name, specialty, qualification (e.g. Laparoscopy, Ortho, M.D., Dr. Sunil)..."
            className="w-full pl-12 pr-4 py-3.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-teal-500 focus:bg-white transition"
          />
        </div>

        {/* Department Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedDept('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition touch-target ${
              selectedDept === 'all'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Departments ({doctors.length})
          </button>
          {departments.map((dept) => {
            const count = doctors.filter((d) => d.department_id === dept.id).length;
            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id.toString())}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition touch-target ${
                  selectedDept === dept.id.toString()
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dept.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Status Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-500">Duty Status:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('available')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'available' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Available in OPD
            </button>
            <button
              onClick={() => setSelectedStatus('busy')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'busy' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Currently Consulting
            </button>
          </div>

          <span className="text-slate-500 font-medium">
            Showing <strong>{filteredDoctors.length}</strong> verified doctors
          </span>
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-slate-600">Loading verified medical roster...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No doctors matching criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or selecting a different clinical department.
          </p>
          <button
            onClick={() => { setSelectedDept('all'); setSelectedStatus('all'); setSearchTerm(''); }}
            className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => {
            const isAvail = doc.status === 'available' || doc.duty_status === 'available';
            const isBusy = doc.status === 'busy' || doc.duty_status === 'busy';

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-teal-400 transition-all flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  {/* Top Doctor Avatar & Status */}
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform shadow-xs">
                      <Stethoscope className="w-7 h-7 text-teal-600 stroke-[2.2]" />
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                        isAvail
                          ? 'bg-emerald-100 text-emerald-800'
                          : isBusy
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAvail ? 'bg-emerald-500' : isBusy ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{isAvail ? 'In OPD Available' : isBusy ? 'Consulting Patient' : 'Off Duty'}</span>
                    </span>
                  </div>

                  {/* Doctor Info Details */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                      {doc.name}
                    </h3>
                    <p className="text-xs font-bold text-teal-700">{doc.specialization}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {doc.qualification || 'MBBS, MD'} • {doc.department_name}
                    </p>
                  </div>

                  {/* Credentials Strip */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">Registration:</span>
                      <span className="font-bold text-slate-800">{doc.registration_number || 'MMC Verified'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">Consultation Room:</span>
                      <span className="font-bold text-teal-700 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{doc.room}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">Shift Timings:</span>
                      <span className="font-semibold text-slate-700 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.shift_start || '09:00'} – {doc.shift_end || '17:00'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Booking Action Buttons */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Link
                    to={`/book-appointment?doctor_id=${doc.id}&dept_id=${doc.department_id}`}
                    className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl text-center shadow-xs transition touch-target flex items-center justify-center space-x-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Slot</span>
                  </Link>

                  <Link
                    to={`/patient?dept=${doc.department_id}&doctor=${doc.id}`}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center transition touch-target flex items-center justify-center space-x-1"
                  >
                    <span>Walk-In Token</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
