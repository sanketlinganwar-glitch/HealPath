import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Sparkles,
  AlertCircle,
  Clock,
  User,
  Phone,
  Calendar,
  Stethoscope,
  HeartPulse,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { getDepartments, getDoctors, createToken, suggestDepartment } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export function PatientRegisterPage() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    department_id: '',
    doctor_id: '',
    priority: 'normal',
    symptoms: '',
    preferred_slot: '10:30',
    source: 'online'
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [errors, setErrors] = useState({});
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    getDepartments().then((data) => {
      setDepartments(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, department_id: data[0].id }));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.department_id) {
      getDoctors(formData.department_id).then(setDoctors).catch(console.error);
    }
  }, [formData.department_id]);

  // Handle senior citizen automatic priority recommendation
  const handleAgeChange = (val) => {
    const ageNum = parseInt(val, 10);
    setFormData((prev) => ({
      ...prev,
      age: val,
      priority: ageNum >= 60 && prev.priority === 'normal' ? 'senior' : prev.priority
    }));
  };

  const handleAiSuggest = async () => {
    if (!formData.symptoms.trim()) {
      setErrors((prev) => ({ ...prev, symptoms: 'Please enter symptoms first to get AI triage.' }));
      return;
    }

    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const res = await suggestDepartment(formData.symptoms);
      setAiSuggestion(res);
      if (res.department_id) {
        setFormData((prev) => ({ ...prev, department_id: res.department_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name || formData.name.length < 2 || formData.name.length > 60) {
      errs.name = 'Name must be between 2 and 60 characters';
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      errs.phone = 'Phone number must be exactly 10 digits';
    }
    const ageNum = parseInt(formData.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      errs.age = 'Age must be between 0 and 120';
    }
    if (!formData.department_id) {
      errs.department_id = 'Please select a hospital department';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        department_id: parseInt(formData.department_id, 10),
        priority: formData.priority,
        symptoms: formData.symptoms.trim() || null,
        source: 'online'
      };

      const resToken = await createToken(payload);
      navigate(`/patient/track/${resToken.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-600 p-6 sm:p-8 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
              <Ticket className="w-6 h-6 text-cyan-200" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold">{t('bookAppointment')}</h1>
              <p className="text-xs text-blue-100">
                Register for outpatient consultation and receive real-time queue tracking
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Section: Patient Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. Patient Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('fullName')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Pawar"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
                {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('phoneNumber')} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                  />
                </div>
                {errors.phone && <p className="text-rose-600 text-[11px] mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('age')} *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={120}
                  value={formData.age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                />
                {errors.age && <p className="text-rose-600 text-[11px] mt-1">{errors.age}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('gender')}
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                >
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                  <option value="other">{t('other')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('priority')}
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={`w-full px-3 py-2 text-sm font-semibold rounded-xl border transition ${
                    formData.priority === 'emergency'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : formData.priority === 'senior'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="normal">{t('normal')}</option>
                  <option value="senior">{t('senior')}</option>
                  <option value="emergency">{t('emergency')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Symptoms & AI Triage */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                {t('symptoms')}
              </label>
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiLoading}
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>{aiLoading ? 'Analyzing...' : t('aiTriageBtn')}</span>
              </button>
            </div>

            <textarea
              rows={2}
              maxLength={300}
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="e.g. Mild chest pain after climbing stairs, persistent dry cough..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
            />
            {errors.symptoms && <p className="text-rose-600 text-[11px]">{errors.symptoms}</p>}

            {/* AI Recommendation Alert */}
            {aiSuggestion && (
              <div className="p-3.5 bg-cyan-50/80 border border-cyan-200 rounded-2xl space-y-1.5 animate-slide-up">
                <div className="flex items-center space-x-2 text-cyan-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <span>AI Recommendation: {aiSuggestion.department_name}</span>
                </div>
                <p className="text-xs text-cyan-800 leading-relaxed">
                  {aiSuggestion.reason}
                </p>
                <p className="text-[10px] text-cyan-700 italic border-t border-cyan-200/60 pt-1">
                  {aiSuggestion.disclaimer}
                </p>
              </div>
            )}
          </div>

          {/* Section: Department & Doctor Preference */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Hospital Department & Preferred Time
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('department')} *
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code}) - {dept.waiting_count} Waiting (~{dept.est_wait_min}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('doctorPreference')}
                </label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                >
                  <option value="">{t('anyDoctor')}</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.specialization} - {doc.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('preferredSlot')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <select
                    value={formData.preferred_slot}
                    onChange={(e) => setFormData({ ...formData, preferred_slot: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition"
                  >
                    <option value="10:00">10:00 AM - 10:15 AM</option>
                    <option value="10:30">10:30 AM - 10:45 AM</option>
                    <option value="11:15">11:15 AM - 11:30 AM</option>
                    <option value="12:00">12:00 PM - 12:15 PM</option>
                    <option value="14:00">02:00 PM - 02:15 PM</option>
                    <option value="15:30">03:30 PM - 03:45 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('langPreference')}
                </label>
                <input
                  type="text"
                  readOnly
                  value={lang === 'hi' ? 'Hindi (हिंदी)' : lang === 'mr' ? 'Marathi (मराठी)' : 'English'}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Medical Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              {t('disclaimer')}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition"
          >
            <span>{loading ? 'Generating Token...' : t('generateTokenBtn')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
