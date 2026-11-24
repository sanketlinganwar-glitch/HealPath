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
  Users,
  X,
  Info,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { getDepartments, getDoctors } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { resolveAssetUrl } from '../utils/assets';

// Helper to extract clean initials for neutral placeholder
function getDoctorInitials(name) {
  if (!name) return 'DR';
  const clean = name.replace(/^Dr\.?\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// Helper to audit and evaluate authentic clinical status
function getDoctorStatusConfig(doc) {
  const isVerified = Boolean(doc.image_url && doc.image_url.startsWith('/images/doctors/'));
  
  if (!isVerified) {
    return {
      label: 'NOT VERIFIED',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      dotClass: 'bg-slate-400',
      isVerified: false
    };
  }

  const dutyStatus = doc.duty_status || doc.status;
  if (dutyStatus === 'busy' || doc.status === 'busy') {
    return {
      label: 'CONSULTING',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
      dotClass: 'bg-amber-500 animate-pulse',
      isVerified: true
    };
  }
  if (dutyStatus === 'on_break') {
    return {
      label: 'ON BREAK',
      badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
      dotClass: 'bg-purple-500',
      isVerified: true
    };
  }
  if (dutyStatus === 'off_duty' || doc.status === 'off') {
    return {
      label: 'OFF DUTY',
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      dotClass: 'bg-slate-400',
      isVerified: true
    };
  }
  return {
    label: 'IN OPD',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    isVerified: true
  };
}

export function DoctorsInfoPage() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);
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
    const statusCfg = getDoctorStatusConfig(doc);

    let matchesStatus = true;
    if (selectedStatus === 'in_opd') {
      matchesStatus = statusCfg.label === 'IN OPD';
    } else if (selectedStatus === 'consulting') {
      matchesStatus = statusCfg.label === 'CONSULTING';
    } else if (selectedStatus === 'off_duty') {
      matchesStatus = statusCfg.label === 'OFF DUTY';
    } else if (selectedStatus === 'verified') {
      matchesStatus = statusCfg.isVerified;
    } else if (selectedStatus === 'not_verified') {
      matchesStatus = !statusCfg.isVerified;
    }

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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
              onClick={() => setSelectedStatus('in_opd')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'in_opd' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              In OPD
            </button>
            <button
              onClick={() => setSelectedStatus('consulting')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'consulting' ? 'bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Consulting
            </button>
            <button
              onClick={() => setSelectedStatus('off_duty')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'off_duty' ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Off Duty
            </button>
            <button
              onClick={() => setSelectedStatus('verified')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                selectedStatus === 'verified' ? 'bg-teal-700 text-white' : 'text-teal-700 hover:bg-teal-50'
              }`}
            >
              Verified Faculty
            </button>
          </div>

          <span className="text-slate-500 font-medium">
            Showing <strong>{filteredDoctors.length}</strong> doctors
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
            const statusCfg = getDoctorStatusConfig(doc);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-teal-400 transition-all flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  {/* Top Doctor Avatar & Status */}
                  <div className="flex items-start justify-between gap-3">
                    {doc.image_url ? (
                      <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden shadow-md border-2 border-teal-500/20 group-hover:border-teal-500 group-hover:shadow-lg transition-all bg-slate-100 shrink-0">
                        <img
                          src={resolveAssetUrl(doc.image_url)}
                          alt={doc.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                        <div className="w-full h-full hidden items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100 text-teal-800 font-black text-xl">
                          {getDoctorInitials(doc.name)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/60 border border-slate-200 text-slate-700 flex flex-col items-center justify-center p-2 shadow-xs group-hover:border-teal-300 transition-all shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1">
                          <Stethoscope className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="text-xs font-black tracking-wider text-slate-700">{getDoctorInitials(doc.name)}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Doctor</span>
                      </div>
                    )}

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 shrink-0 ${statusCfg.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`} />
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>

                  {/* Doctor Info Details */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                        {doc.name}
                      </h3>
                      {statusCfg.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" title="Verified Sanjeevan Hospital Consultant" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-teal-700">{doc.specialization}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {doc.qualification || 'MBBS, MD'} • {doc.department_name}
                    </p>
                  </div>

                  {/* Credentials Strip */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">Registration:</span>
                      <span className="font-bold text-slate-800">{doc.registration_number || (statusCfg.isVerified ? 'MMC Verified' : 'Verification Pending')}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">Consultation Room:</span>
                      <span className="font-bold text-teal-700 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{doc.room}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-400">OPD Shift Timings:</span>
                      <span className="font-semibold text-slate-700 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.shift_start || '09:00'} – {doc.shift_end || '17:00'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons: Book Slot, Walk-In Token, View Profile */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to={`/book-appointment?doctor_id=${doc.id}&dept_id=${doc.department_id}`}
                      className="w-full py-2.5 px-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl text-center shadow-xs transition touch-target flex items-center justify-center space-x-1"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Slot</span>
                    </Link>

                    <Link
                      to={`/patient?dept=${doc.department_id}&doctor=${doc.id}`}
                      className="w-full py-2.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center transition touch-target flex items-center justify-center space-x-1"
                    >
                      <span>Walk-In Token</span>
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDoctorProfile(doc)}
                    className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-teal-700 text-xs font-semibold rounded-xl text-center transition flex items-center justify-center space-x-1.5"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>View Profile & Schedule</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Doctor Profile Modal */}
      {selectedDoctorProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative">
            <button
              onClick={() => setSelectedDoctorProfile(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Close Profile"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Doctor Header */}
            <div className="flex items-start space-x-4">
              {selectedDoctorProfile.image_url ? (
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 border-teal-500/30 shadow-md shrink-0 bg-slate-100">
                  <img
                    src={resolveAssetUrl(selectedDoctorProfile.image_url)}
                    alt={selectedDoctorProfile.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              ) : (
                <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex flex-col items-center justify-center shrink-0">
                  <Stethoscope className="w-8 h-8 text-teal-600 mb-1" />
                  <span className="text-xs font-black">{getDoctorInitials(selectedDoctorProfile.name)}</span>
                </div>
              )}

              <div className="space-y-1">
                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  getDoctorStatusConfig(selectedDoctorProfile).badgeClass
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getDoctorStatusConfig(selectedDoctorProfile).dotClass}`} />
                  <span>{getDoctorStatusConfig(selectedDoctorProfile).label}</span>
                </span>
                <h3 className="text-xl font-black text-slate-900">{selectedDoctorProfile.name}</h3>
                <p className="text-xs font-bold text-teal-700">{selectedDoctorProfile.specialization}</p>
                <p className="text-xs text-slate-500">{selectedDoctorProfile.qualification || 'MBBS, MD'} • {selectedDoctorProfile.department_name}</p>
              </div>
            </div>

            {/* Hospital Affiliation & Credentials Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Hospital Facility:</span>
                <span className="font-bold">Sanjeevan Multispecialty Hospital, Yavatmal</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Consultation Room:</span>
                <span className="font-bold text-teal-700">{selectedDoctorProfile.room}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">OPD Shift Hours:</span>
                <span className="font-bold">{selectedDoctorProfile.shift_start || '09:00'} – {selectedDoctorProfile.shift_end || '17:00'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Midday Break:</span>
                <span className="font-medium text-slate-600">{selectedDoctorProfile.break_start || '13:00'} – {selectedDoctorProfile.break_end || '14:00'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Registration Number:</span>
                <span className="font-bold text-slate-800">{selectedDoctorProfile.registration_number || (getDoctorStatusConfig(selectedDoctorProfile).isVerified ? 'MMC Verified' : 'Verification Pending')}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                to={`/book-appointment?doctor_id=${selectedDoctorProfile.id}&dept_id=${selectedDoctorProfile.department_id}`}
                onClick={() => setSelectedDoctorProfile(null)}
                className="py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl text-center shadow-md shadow-teal-600/30 transition flex items-center justify-center space-x-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </Link>

              <Link
                to={`/patient?dept=${selectedDoctorProfile.department_id}&doctor=${selectedDoctorProfile.id}`}
                onClick={() => setSelectedDoctorProfile(null)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl text-center transition flex items-center justify-center space-x-1.5"
              >
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>Walk-In Token</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
