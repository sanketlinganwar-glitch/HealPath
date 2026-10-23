import React, { useState, useEffect } from 'react';
import { Stethoscope, MapPin, CheckCircle, Clock, Search } from 'lucide-react';
import { getDepartments, getDoctors } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export function DoctorsInfoPage() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    Promise.all([getDepartments(), getDoctors()]).then(([depts, docs]) => {
      setDepartments(depts);
      setDoctors(docs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredDoctors = doctors.filter((doc) => {
    const matchesDept = selectedDept === 'all' || doc.department_id === parseInt(selectedDept, 10);
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.department_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Hospital Medical Staff & Departments
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Explore our specialist doctors, OPD consultation rooms, and duty availability
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Department Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDept('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedDept === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Specialists
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id.toString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedDept === dept.id.toString()
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search doctor or specialty..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  doc.status === 'busy'
                    ? 'bg-amber-100 text-amber-800'
                    : doc.status === 'available'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {doc.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">{doc.name}</h3>
                <p className="text-xs text-blue-700 font-semibold mt-0.5">{doc.specialization}</p>
                <p className="text-xs text-slate-500">{doc.department_name}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center space-x-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{doc.room}</span>
              </span>
              <a
                href="#/patient"
                className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                Book Token →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
