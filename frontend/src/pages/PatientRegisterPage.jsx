import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ArrowRight,
  CheckCircle2,
  Lock,
  PhoneCall
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
  const [consentGiven, setConsentGiven] = useState(true);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [errors, setErrors] = useState({});
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const deptParam = params.get('dept');
    const docParam = params.get('doctor');

    getDepartments().then((data) => {
      setDepartments(data);
      if (data.length > 0) {
        const initialDept = deptParam ? parseInt(deptParam, 10) : data[0].id;
        setFormData((prev) => ({
          ...prev,
          department_id: initialDept,
          doctor_id: docParam ? parseInt(docParam, 10) : ''
        }));
      }
    }).catch(console.error);
  }, [location.search]);

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
    if (!consentGiven) {
      errs.consent = 'Please provide digital consent for OPD token registration.';
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
        doctor_id: formData.doctor_id ? parseInt(formData.doctor_id, 10) : undefined,
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
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 p-6 sm:p-8 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
              <Ticket className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">{t('bookAppointment') || 'Register for OPD Consultation'}</h1>
              <p className="text-xs text-teal-100">
                Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="bg-rose-50 border-b border-rose-100 p-4 px-6 sm:px-8 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Severe chest pain, breathlessness, or trauma? Contact 24/7 Emergency immediately:</span>
          </div>
          <a href="tel:+919552625262" className="font-black text-rose-700 underline shrink-0 ml-2">
            +91 95526 25262
          </a>
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
                    placeholder="e.g. Ramesh Rathod"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition"
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
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition"
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
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition"
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
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition font-medium"
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
                  className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl border transition ${
                    formData.priority === 'emergency'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : formData.priority === 'senior'
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="normal">{t('normal')}</option>
                  <option value="senior">{t('senior')} (60+ yrs)</option>
                  <option value="emergency">{t('emergency')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Department & Doctor */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Hospital Department & Doctor Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('department')} *
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value, doctor_id: '' })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition font-medium"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                {errors.department_id && (
                  <p className="text-rose-600 text-[11px] mt-1">{errors.department_id}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('doctorPreference')}
                </label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition font-medium"
                >
                  <option value="">Any Available Specialist</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.room} - {doc.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: AI Triage & Symptoms */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                3. Symptoms & Smart Routing (Optional)
              </h3>
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={aiLoading}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>{aiLoading ? 'Analyzing...' : 'AI Department Triage'}</span>
              </button>
            </div>

            <textarea
              rows={2}
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="e.g. Fever with chills, chest tightness, severe cough for 3 days..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white transition"
            />
            {errors.symptoms && (
              <p className="text-rose-600 text-[11px] mt-1">{errors.symptoms}</p>
            )}

            {aiSuggestion && (
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-teal-800 font-bold">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>AI Recommended: {aiSuggestion.department_name}</span>
                </div>
                <p className="text-teal-700 text-[11px] leading-relaxed">{aiSuggestion.explanation}</p>
              </div>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start space-x-2.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>
                I consent to digital OPD queue registration under the Digital Personal Data Protection (DPDP) Act, 2023 and agree to receive queue status SMS/WhatsApp updates.
              </span>
            </label>
            {errors.consent && <p className="text-rose-600 text-[11px] mt-1">{errors.consent}</p>}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base rounded-2xl transition shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 touch-target"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Issuing Token...</span>
                </>
              ) : (
                <>
                  <Ticket className="w-5 h-5" />
                  <span>Generate OPD Token & QR Pass</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
