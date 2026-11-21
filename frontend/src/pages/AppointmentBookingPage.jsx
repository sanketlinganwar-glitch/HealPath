import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MessageSquare
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

  // Step 1: Department & Doctor selection
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Step 2: Date & Slot selection
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 3: Patient details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirmation state
  const [bookedAppt, setBookedAppt] = useState(null);

  // Load departments on mount
  useEffect(() => {
    getDepartments()
      .then((data) => {
        setDepartments(data);
        if (data.length > 0) {
          setSelectedDept(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load departments', err));
  }, []);

  // Load doctors when department changes
  useEffect(() => {
    if (!selectedDept) return;
    getDoctors(selectedDept)
      .then((docs) => {
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctor(docs[0]);
        } else {
          setSelectedDoctor(null);
        }
      })
      .catch((err) => console.error('Failed to load doctors', err));
  }, [selectedDept]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      showToast('Please select a consultation time slot', 'warning');
      return;
    }
    if (phone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    setSubmitting(true);
    const idempotencyKey = `appt-${phone}-${selectedDoctor.id}-${selectedSlot.time}-${selectedDate}`;

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
      showToast(t('bookSuccess'), 'success');
    } catch (err) {
      console.error('Booking failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  // If already booked, show confirmation view with QR
  if (bookedAppt) {
    const currentDept = departments.find((d) => d.id === bookedAppt.department_id);
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8 animate-fadeIn">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full mb-1">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Appointment Confirmed!
          </h1>
          <p className="text-sm text-slate-600">
            A confirmation message has been dispatched via WhatsApp to {bookedAppt.patient.phone}.
          </p>
        </div>

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

        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-800 space-y-2">
          <div className="flex items-center space-x-2 font-bold">
            <CalendarCheck className="w-4 h-4 text-teal-600" />
            <span>Consultation Instructions</span>
          </div>
          <p>
            Please arrive at the hospital reception 15 minutes before your scheduled slot (
            {new Date(bookedAppt.slot_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
            Present your Appointment Code or QR token to the receptionist to receive your live consultation turn.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBookedAppt(null)}
            className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition"
          >
            Book Another Appointment
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition shadow-xs"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const selectedDeptObj = departments.find((d) => d.id === Number(selectedDept));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold border border-teal-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>{t('onlineBooking')}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Schedule Doctor Consultation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Reserve your preferred time slot online. Avoid waiting in long queues with automated check-in and WhatsApp reminders.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Department & Doctor */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base sm:text-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>1. Choose Department & Specialist</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('department')}</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.active_doctors} Doctors Active)
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('doctorPreference')}</label>
              <select
                value={selectedDoctor?.id || ''}
                onChange={(e) => {
                  const doc = doctors.find((d) => d.id === Number(e.target.value));
                  setSelectedDoctor(doc || null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} — {doc.specialization} ({doc.room})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedDoctor && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedDoctor.name}</p>
                  <p className="text-slate-500">{selectedDoctor.specialization} • Cabin: {selectedDoctor.room}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  selectedDoctor.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {selectedDoctor.status === 'available' ? 'On Duty' : 'Off Duty'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Shift: {selectedDoctor.shift_start || '09:00'} - {selectedDoctor.shift_end || '17:00'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Date & Available Slots */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base sm:text-lg">
              <Clock className="w-5 h-5 text-teal-600" />
              <span>2. Select Appointment Date & Time Slot</span>
            </div>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {loadingSlots ? (
            <div className="text-center py-8 text-slate-400 text-xs animate-pulse">
              Loading available consultation slots...
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No slots available for this doctor on selected date. Please pick another date or doctor.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">Available 30-minute Consultation Slots:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {slots.map((s, idx) => {
                  const isSelected = selectedSlot?.time === s.time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!s.is_available}
                      onClick={() => setSelectedSlot(s)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center border ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20 scale-105'
                          : s.is_available
                          ? 'bg-teal-50/50 hover:bg-teal-50 text-teal-900 border-teal-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>{s.time}</span>
                      <span className="text-[9px] font-normal mt-0.5">
                        {s.is_available ? 'Available' : 'Booked'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Patient Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base sm:text-lg">
            <User className="w-5 h-5 text-teal-600" />
            <span>3. Patient Details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('fullName')} *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patil"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('phoneNumber')} *</label>
              <input
                type="tel"
                required
                pattern="[0-9]{10}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('age')} *</label>
              <input
                type="number"
                required
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 45"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('gender')} *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Symptoms / Notes for Doctor (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brief description of symptoms, previous medical history, or reason for appointment..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-2 text-slate-600 text-xs">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <span>
              Your phone number is used strictly for queue tracking and WhatsApp appointment reminders.
              HealPath does not share medical data with external advertisers.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-teal-600/25 transition flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span>Confirming Reservation...</span>
            ) : (
              <>
                <span>{t('confirmBooking')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
