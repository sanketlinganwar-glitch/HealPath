import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Stethoscope,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  HeartPulse,
  Info
} from 'lucide-react';
import {
  getDepartments,
  getDoctors,
  getAppointmentSlots,
  bookAppointment,
  showToast
} from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { QRCodeCard } from '../components/QRCodeCard';

export function AppointmentBookingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Multi-Step Stepper State (Steps 1 to 4)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 & 2: Department & Doctor selection
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Step 3 & 4: Date & Slot selection
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 5: Patient details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Step 8: Confirmation state
  const [bookedAppt, setBookedAppt] = useState(null);

  // Parse query params (e.g. ?doctor_id=1&dept_id=1)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const deptParam = params.get('dept_id') || params.get('dept');
    const docParam = params.get('doctor_id') || params.get('doctor');

    getDepartments()
      .then((data) => {
        setDepartments(data);
        if (data.length > 0) {
          const matchedDept = deptParam ? data.find((d) => d.id === Number(deptParam)) : null;
          const initialDeptId = matchedDept ? matchedDept.id : data[0].id;
          setSelectedDept(initialDeptId);

          // Fetch doctors for initial dept
          getDoctors(initialDeptId).then((docs) => {
            setDoctors(docs);
            if (docParam) {
              const matchedDoc = docs.find((d) => d.id === Number(docParam));
              if (matchedDoc) {
                setSelectedDoctor(matchedDoc);
                setCurrentStep(2); // Jump directly to slot selection
              } else if (docs.length > 0) {
                setSelectedDoctor(docs[0]);
              }
            } else if (docs.length > 0) {
              setSelectedDoctor(docs[0]);
            }
          });
        }
      })
      .catch((err) => console.error('Failed to load departments', err));
  }, [location.search]);

  // Load doctors when department manually changes
  const handleDepartmentChange = (deptId) => {
    const idNum = Number(deptId);
    setSelectedDept(idNum);
    setSelectedDoctor(null);
    setSelectedSlot(null);
    getDoctors(idNum)
      .then((docs) => {
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctor(docs[0]);
        }
      })
      .catch((err) => console.error('Failed to load doctors', err));
  };

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    getAppointmentSlots(selectedDoctor.id, selectedDate)
      .then((data) => {
        setSlots(data);
        setSelectedSlot(null);
      })
      .catch((err) => {
        console.error('Failed to load slots', err);
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, selectedDate]);

  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!selectedDept) errs.dept = 'Please select a department.';
      if (!selectedDoctor) errs.doctor = 'Please select a specialist doctor.';
    } else if (step === 2) {
      if (!selectedSlot) errs.slot = 'Please select an available consultation time slot.';
    } else if (step === 3) {
      if (!name.trim() || name.trim().length < 2) {
        errs.name = 'Patient name must be at least 2 characters.';
      }
      if (!/^\d{10}$/.test(phone.trim())) {
        errs.phone = 'Mobile number must be exactly 10 digits.';
      }
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        errs.age = 'Age must be between 0 and 120.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }

    setSubmitting(true);
    const idempotencyKey = `appt-${phone.trim()}-${selectedDoctor.id}-${selectedSlot.time}-${selectedDate}`;

    try {
      const res = await bookAppointment({
        department_id: Number(selectedDept),
        doctor_id: selectedDoctor.id,
        slot_time: selectedSlot.slot_datetime,
        name: name.trim(),
        phone: phone.trim(),
        age: Number(age),
        gender,
        notes: notes.trim() || undefined,
        idempotency_key: idempotencyKey,
      });

      setBookedAppt(res);
      showToast(t('bookSuccess') || 'Appointment confirmed successfully!', 'success');
    } catch (err) {
      console.error('Booking failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 8: BOOKING CONFIRMATION SCREEN
  if (bookedAppt) {
    const currentDept = departments.find((d) => d.id === bookedAppt.department_id);
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8 animate-fadeIn">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 bg-emerald-100 text-emerald-700 rounded-full mb-1 shadow-md">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Consultation Confirmed!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Your appointment has been registered at Sanjeevan Multispecialty Hospital. Confirmation code and SMS have been issued to <strong>{bookedAppt.patient.phone}</strong>.
          </p>
        </div>

        {/* Verifiable QR Card */}
        <QRCodeCard
          value={`${window.location.origin}/#/patient/track/${bookedAppt.id}?type=appointment`}
          appointmentCode={bookedAppt.appointment_code}
          tokenNumber={bookedAppt.appointment_code}
          patientName={bookedAppt.patient.name}
          departmentName={currentDept?.name || 'Hospital Department'}
          doctorName={bookedAppt.doctor_name}
          room={bookedAppt.room}
          isAppointment={true}
        />

        {/* Important Hospital Instructions */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-xs text-teal-900 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-sm text-teal-800">
            <CalendarCheck className="w-4 h-4 text-teal-600" />
            <span>Consultation & Check-In Protocol</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-teal-800/90 leading-relaxed">
            <li>Please arrive at the hospital reception <strong>15 minutes before</strong> your scheduled slot ({new Date(bookedAppt.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).</li>
            <li>Scan your QR pass at the entrance kiosk or present your code <strong>{bookedAppt.appointment_code}</strong> at the reception desk to enter the live queue.</li>
            <li>Consultation Room: <strong>{bookedAppt.room}</strong> with <strong>{bookedAppt.doctor_name}</strong>.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setBookedAppt(null);
              setCurrentStep(1);
            }}
            className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition touch-target"
          >
            Book Another Appointment
          </button>

          <Link
            to="/patient/dashboard"
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-teal-600/30 flex items-center space-x-2 touch-target"
          >
            <HeartPulse className="w-4 h-4" />
            <span>View in Health Wallet</span>
          </Link>

          <Link
            to="/"
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition touch-target"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  const selectedDeptObj = departments.find((d) => d.id === Number(selectedDept));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>Sanjeevan Hospital Guaranteed OPD Slots</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Book Doctor Consultation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Schedule your consultation in 4 simple steps. Guaranteed time slots with automatic QR arrival confirmation.
        </p>
      </div>

      {/* Progress Stepper (Apollo-Inspired Clean Flow) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className={`p-2 rounded-xl transition ${currentStep === 1 ? 'bg-teal-600 text-white font-bold' : currentStep > 1 ? 'text-teal-700 font-semibold bg-teal-50' : 'text-slate-400'}`}>
            <span>1. Specialist</span>
          </div>
          <div className={`p-2 rounded-xl transition ${currentStep === 2 ? 'bg-teal-600 text-white font-bold' : currentStep > 2 ? 'text-teal-700 font-semibold bg-teal-50' : 'text-slate-400'}`}>
            <span>2. Time Slot</span>
          </div>
          <div className={`p-2 rounded-xl transition ${currentStep === 3 ? 'bg-teal-600 text-white font-bold' : currentStep > 3 ? 'text-teal-700 font-semibold bg-teal-50' : 'text-slate-400'}`}>
            <span>3. Patient Info</span>
          </div>
          <div className={`p-2 rounded-xl transition ${currentStep === 4 ? 'bg-teal-600 text-white font-bold' : 'text-slate-400'}`}>
            <span>4. Review & Confirm</span>
          </div>
        </div>
      </div>

      {/* STEP 1: CHOOSE DEPARTMENT & SPECIALIST */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6 animate-fadeIn">
          <div className="flex items-center space-x-2 text-slate-900 font-black text-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>Step 1: Choose Medical Department & Doctor</span>
          </div>

          <div className="space-y-4">
            {/* Department Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Department <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {departments.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => handleDepartmentChange(d.id)}
                    className={`p-3.5 rounded-2xl text-left border text-xs font-bold transition flex items-center justify-between touch-target ${
                      selectedDept === d.id
                        ? 'bg-teal-50 border-teal-600 text-teal-900 ring-2 ring-teal-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{d.name}</span>
                    {selectedDept === d.id && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                  </button>
                ))}
              </div>
              {errors.dept && <p className="text-xs text-rose-600 font-medium">{errors.dept}</p>}
            </div>

            {/* Doctor Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Specialist Doctor <span className="text-rose-500">*</span>
              </label>
              {doctors.length === 0 ? (
                <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl">
                  No specialists currently listed for this department.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctors.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start justify-between space-x-3 ${
                        selectedDoctor?.id === doc.id
                          ? 'bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{doc.name}</h4>
                          <p className="text-xs text-teal-700 font-semibold">{doc.specialization}</p>
                          <p className="text-[11px] text-slate-500">{doc.qualification || 'MBBS, MD'} • {doc.room}</p>
                          <p className="text-[10px] text-slate-400 mt-1">Shift: {doc.shift_start} - {doc.shift_end}</p>
                        </div>
                      </div>
                      {selectedDoctor?.id === doc.id && (
                        <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {errors.doctor && <p className="text-xs text-rose-600 font-medium">{errors.doctor}</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={nextStep}
              disabled={!selectedDoctor}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-teal-600/30 flex items-center space-x-2 touch-target"
            >
              <span>Continue to Time Slot</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DATE & AVAILABLE TIME SLOT */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900 font-black text-lg">
              <Clock className="w-5 h-5 text-teal-600" />
              <span>Step 2: Choose Consultation Date & Available Slot</span>
            </div>
            <span className="text-xs text-teal-700 font-bold bg-teal-50 px-3 py-1 rounded-full">
              {selectedDoctor?.name} ({selectedDoctor?.room})
            </span>
          </div>

          <div className="space-y-4">
            {/* Consultation Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Consultation Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Slots Matrix */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Available Slots for {selectedDate} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {slots.filter((s) => s.available).length} slots open
                </span>
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p>Retrieving doctor's actual duty schedule and bookings...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 border border-slate-200">
                  No slots available on this date. Doctor may be off duty or slots are fully booked. Please choose another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {slots.map((slot, idx) => (
                    <button
                      type="button"
                      key={idx}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold transition flex flex-col items-center justify-center touch-target ${
                        !slot.available
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                          : selectedSlot?.time === slot.time
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-2 ring-teal-500'
                          : 'bg-white text-slate-800 border border-slate-200 hover:border-teal-500 hover:bg-teal-50'
                      }`}
                    >
                      <span>{slot.time}</span>
                      <span className="text-[9px] font-normal mt-0.5">
                        {slot.available ? 'Available' : 'Booked'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {errors.slot && <p className="text-xs text-rose-600 font-medium">{errors.slot}</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={nextStep}
              disabled={!selectedSlot}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-teal-600/30 flex items-center space-x-2 touch-target"
            >
              <span>Continue to Patient Details</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PATIENT INFORMATION */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6 animate-fadeIn">
          <div className="flex items-center space-x-2 text-slate-900 font-black text-lg">
            <User className="w-5 h-5 text-teal-600" />
            <span>Step 3: Enter Patient Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Patient Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Rathod"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.name && <p className="text-xs text-rose-600 font-medium">{errors.name}</p>}
            </div>

            {/* Mobile Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                10-Digit Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.phone && <p className="text-xs text-rose-600 font-medium">{errors.phone}</p>}
            </div>

            {/* Age & Gender */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Age <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.age && <p className="text-xs text-rose-600 font-medium">{errors.age}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Medical Notes / Symptoms */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Primary Symptoms or Clinical Concern (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Persistent knee pain for 2 weeks, previous X-ray report available..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-teal-600/30 flex items-center space-x-2 touch-target"
            >
              <span>Review Booking</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & CONFIRM */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-md space-y-6 animate-fadeIn">
          <div className="flex items-center space-x-2 text-slate-900 font-black text-lg">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span>Step 4: Review Consultation & Confirm</span>
          </div>

          {/* Booking Summary Box */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Consulting Specialist</p>
                <p className="font-extrabold text-slate-900 text-base">{selectedDoctor?.name}</p>
                <p className="text-teal-700 font-semibold">{selectedDoctor?.specialization}</p>
                <p className="text-slate-500">{selectedDoctor?.room} • {selectedDeptObj?.name}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Scheduled Date & Time</p>
                <p className="font-extrabold text-teal-700 text-base">{selectedSlot?.time} ({selectedDate})</p>
                <p className="text-slate-500">Arrival check-in 15 min prior</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Patient Name</p>
                <p className="font-bold text-slate-800">{name}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Phone Number</p>
                <p className="font-bold text-slate-800">{phone}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase">Age / Gender</p>
                <p className="font-bold text-slate-800">{age} yrs / {gender}</p>
              </div>
            </div>

            {notes && (
              <div className="pt-2 border-t border-slate-200/80">
                <p className="text-[11px] text-slate-400 font-bold uppercase">Notes / Symptoms</p>
                <p className="text-slate-700 italic">"{notes}"</p>
              </div>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              By confirming, a digital appointment record will be created in the hospital management database. A confirmation SMS will be triggered to <strong>{phone}</strong>.
            </span>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition shadow-lg shadow-teal-600/30 flex items-center space-x-2 touch-target"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Reserving Slot...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Appointment</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
