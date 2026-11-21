import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  User,
  Phone,
  Clock,
  CheckCircle2,
  PhoneCall,
  Users,
  AlertTriangle,
  PlayCircle,
  Activity,
  ArrowRight,
  FileText,
  Plus,
  Trash2,
  Printer,
  ShieldAlert,
  Coffee,
  X,
  Calendar
} from 'lucide-react';
import {
  getDoctorCurrent,
  callNext,
  completeToken,
  updateDoctorRoster,
  verifyEmergencyToken,
  createPrescription,
  getPrescriptionByToken,
  showToast
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePolling } from '../hooks/usePolling';

export function DoctorConsole() {
  const { user } = useAuth();
  const doctorId = user?.doctor_id || 1; // Default to Dr. Rajesh Sharma if admin viewing
  const [consoleData, setConsoleData] = useState(null);
  const [calling, setCalling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Digital Prescription state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [existingPrescription, setExistingPrescription] = useState(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '',
    clinical_notes: '',
    follow_up_date: '',
    medicines: [
      { name: 'Paracetamol 650mg', dosage: '1 tab', frequency: '1-0-1', duration: '3 days', instructions: 'After food' }
    ]
  });

  // Emergency clinical verification modal
  const [verifyTokenModal, setVerifyTokenModal] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');

  const fetchConsole = async () => {
    try {
      const data = await getDoctorCurrent(doctorId);
      setConsoleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 5s
  usePolling(fetchConsole, 5000);

  // Check for existing prescription when current token changes
  useEffect(() => {
    if (consoleData?.current?.id) {
      getPrescriptionByToken(consoleData.current.id)
        .then((p) => {
          setExistingPrescription(p);
          if (p) {
            setPrescriptionForm({
              diagnosis: p.diagnosis || '',
              clinical_notes: p.clinical_notes || '',
              follow_up_date: p.follow_up_date ? p.follow_up_date.split('T')[0] : '',
              medicines: Array.isArray(p.medicines) && p.medicines.length > 0 ? p.medicines : [
                { name: '', dosage: '', frequency: '1-0-1', duration: '5 days', instructions: 'After meals' }
              ]
            });
          }
        })
        .catch(() => setExistingPrescription(null));
    } else {
      setExistingPrescription(null);
    }
  }, [consoleData?.current?.id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoctorRoster({
        doctor_id: doctorId,
        duty_status: newStatus
      });
      showToast(`Duty roster updated to: ${newStatus.toUpperCase()}`, 'success');
      fetchConsole();
    } catch (err) {
      showToast(err.message || 'Failed to update roster', 'error');
    }
  };

  const handleEmergencyVerify = async (tokenId, verified) => {
    try {
      await verifyEmergencyToken({
        token_id: tokenId,
        verified,
        clinical_notes: clinicalNotes || undefined
      });
      showToast(verified ? 'Emergency clinically verified!' : 'Emergency flag dismissed', 'success');
      setVerifyTokenModal(null);
      setClinicalNotes('');
      fetchConsole();
    } catch (err) {
      showToast(err.message || 'Verification failed', 'error');
    }
  };

  const handleAddMedicine = () => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        { name: '', dosage: '', frequency: '1-0-1', duration: '5 days', instructions: 'After food' }
      ]
    }));
  };

  const handleRemoveMedicine = (idx) => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== idx)
    }));
  };

  const handleMedicineChange = (idx, field, value) => {
    setPrescriptionForm((prev) => {
      const updated = [...prev.medicines];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, medicines: updated };
    });
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!consoleData?.current?.id) return;
    if (!prescriptionForm.diagnosis.trim()) {
      showToast('Please provide a medical diagnosis', 'error');
      return;
    }

    try {
      const validMeds = prescriptionForm.medicines.filter((m) => m.name.trim());
      const payload = {
        token_id: consoleData.current.id,
        appointment_id: consoleData.current.appointment_id || undefined,
        diagnosis: prescriptionForm.diagnosis.trim(),
        clinical_notes: prescriptionForm.clinical_notes.trim() || undefined,
        follow_up_date: prescriptionForm.follow_up_date ? new Date(prescriptionForm.follow_up_date).toISOString() : undefined,
        medicines: validMeds
      };

      const res = await createPrescription(payload);
      setExistingPrescription(res);
      showToast('Digital prescription saved and signed!', 'success');
      setShowPrescriptionModal(false);
    } catch (err) {
      showToast(err.message || 'Failed to save prescription', 'error');
    }
  };

  const handleCallNext = async () => {
    setCalling(true);
    try {
      await callNext(doctorId);
      fetchConsole();
    } catch (err) {
      console.error(err);
    } finally {
      setCalling(false);
    }
  };

  const handleComplete = async (tokenId) => {
    setCompleting(true);
    try {
      await completeToken(tokenId);
      fetchConsole();
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  if (loading && !consoleData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Activity className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Connecting to Doctor OPD console...</p>
      </div>
    );
  }

  const doctor = consoleData?.doctor;
  const currentToken = consoleData?.current;
  const nextUp = consoleData?.next_up || [];
  const waitingCount = consoleData?.waiting_count || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Doctor Profile & Duty Roster Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Stethoscope className="w-8 h-8 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">{doctor?.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                doctor?.duty_status === 'busy' || doctor?.status === 'busy'
                  ? 'bg-amber-400 text-amber-950'
                  : doctor?.duty_status === 'on_break'
                  ? 'bg-purple-300 text-purple-950'
                  : doctor?.duty_status === 'off_duty'
                  ? 'bg-slate-400 text-slate-950'
                  : 'bg-emerald-400 text-emerald-950'
              }`}>
                {doctor?.duty_status || doctor?.status}
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              {doctor?.specialization} • {doctor?.department_name} (Room: {doctor?.room})
            </p>
          </div>
        </div>

        {/* Duty Roster Quick Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleStatusChange('available')}
              className={`px-3 py-1.5 rounded-xl transition ${
                doctor?.duty_status === 'available' || doctor?.status === 'available'
                  ? 'bg-emerald-500 text-white shadow-xs font-black'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Available
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('busy')}
              className={`px-3 py-1.5 rounded-xl transition ${
                doctor?.duty_status === 'busy' || doctor?.status === 'busy'
                  ? 'bg-amber-500 text-white shadow-xs font-black'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Busy
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('on_break')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1 ${
                doctor?.duty_status === 'on_break'
                  ? 'bg-purple-600 text-white shadow-xs font-black'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <Coffee className="w-3 h-3" />
              <span>Break</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('off_duty')}
              className={`px-3 py-1.5 rounded-xl transition ${
                doctor?.duty_status === 'off_duty'
                  ? 'bg-slate-600 text-white shadow-xs font-black'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Off Duty
            </button>
          </div>

          <div className="px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-xs text-center min-w-[90px]">
            <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Queue</span>
            <span className="text-xl font-black text-cyan-300">{waitingCount} waiting</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Center Column: Active Consultation (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {currentToken ? (
            /* Current Patient in Consultation */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/40 shadow-lg space-y-6 animate-scale-up">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                  <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                    Current Patient in Consultation
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {currentToken.priority === 'emergency' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      🚨 EMERGENCY
                    </span>
                  )}
                  <span className="font-mono font-black text-2xl text-emerald-700">
                    {currentToken.token_number}
                  </span>
                </div>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Patient Name & Age
                  </span>
                  <div className="text-base font-extrabold text-slate-900">
                    {currentToken.patient?.name}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">
                    {currentToken.patient?.gender}, {currentToken.patient?.age} Years
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone & Priority
                  </span>
                  <div className="text-base font-bold text-slate-900 font-mono">
                    {currentToken.patient?.phone}
                  </div>
                  <div className="text-xs font-semibold capitalize text-blue-700">
                    Priority: {currentToken.priority}
                  </div>
                </div>
              </div>

              {/* Symptoms */}
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Reported Symptoms / Reason
                </span>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  {currentToken.symptoms || 'No specific symptoms noted.'}
                </p>
              </div>

              {/* Digital Prescription Management Card */}
              <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-teal-950">
                      {existingPrescription ? 'Digital Prescription Issued' : 'Digital Prescription Management'}
                    </h4>
                    <p className="text-xs text-teal-700">
                      {existingPrescription
                        ? `Rx recorded (${existingPrescription.medicines?.length || 0} medicines prescribed)`
                        : 'Generate structured digital prescription for this patient'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(true)}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>{existingPrescription ? 'View / Edit Rx' : '+ Write Prescription'}</span>
                </button>
              </div>

              {/* Finish Consultation Button */}
              <button
                type="button"
                disabled={completing}
                onClick={() => handleComplete(currentToken.id)}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{completing ? 'Completing...' : 'Complete Consultation'}</span>
              </button>
            </div>
          ) : (
            /* No Active Consultation: Call Next Patient Card */
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Consultation Room Available</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {waitingCount > 0
                    ? `There are ${waitingCount} patient(s) waiting in ${doctor?.department_name}.`
                    : 'No patients waiting in queue right now.'}
                </p>
              </div>

              <button
                type="button"
                disabled={calling || waitingCount === 0 || doctor?.duty_status === 'off_duty'}
                onClick={handleCallNext}
                className="px-8 py-4 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-800 hover:to-cyan-700 disabled:opacity-40 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-blue-600/25 inline-flex items-center space-x-3 transition transform hover:scale-102"
              >
                <PlayCircle className="w-6 h-6" />
                <span>{calling ? 'Calling Patient...' : 'Call Next Patient'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Next Up Queue Preview (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Next Up in Line</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{nextUp.length} next</span>
          </div>

          {nextUp.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              No upcoming patients in queue.
            </p>
          ) : (
            <div className="space-y-3">
              {nextUp.map((token) => (
                <div
                  key={token.id}
                  className={`p-3.5 rounded-2xl border transition space-y-2 ${
                    token.priority === 'emergency'
                      ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                      : 'bg-slate-50 hover:bg-blue-50/60 border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-blue-700">
                      {token.token_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      token.priority === 'emergency'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : token.priority === 'senior'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {token.priority}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800">
                    {token.patient?.name} ({token.patient?.age}y)
                  </div>

                  {token.symptoms && (
                    <p className="text-[11px] text-slate-500 truncate">{token.symptoms}</p>
                  )}

                  {/* Emergency verification trigger */}
                  {token.priority === 'emergency' && !token.emergency_verified_by && (
                    <button
                      type="button"
                      onClick={() => setVerifyTokenModal(token)}
                      className="w-full mt-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center justify-center space-x-1 transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Verify Emergency Priority</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Clinical Verification Modal */}
      {verifyTokenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="font-extrabold text-base text-slate-900">Clinical Emergency Triage</h3>
              </div>
              <button
                onClick={() => setVerifyTokenModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Patient <strong>{verifyTokenModal.patient?.name}</strong> (Token: <strong>{verifyTokenModal.token_number}</strong>) was flagged for emergency prioritization. Reason: <em>{verifyTokenModal.emergency_reason || 'Urgent condition'}</em>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Doctor Clinical Triage Notes
              </label>
              <textarea
                rows="2"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Observed vitals, acute distress, immediate intervention rationale..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => handleEmergencyVerify(verifyTokenModal.id, true)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Confirm Emergency Priority
              </button>
              <button
                type="button"
                onClick={() => handleEmergencyVerify(verifyTokenModal.id, false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Dismiss to Standard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                  HealPath OPD Prescription Pad
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Dr. {doctor?.name} • {doctor?.department_name}
                </h3>
              </div>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient Header */}
            <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">PATIENT</span>
                <span className="font-extrabold text-slate-800">{currentToken?.patient?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">AGE / GENDER</span>
                <span className="font-bold text-slate-700">{currentToken?.patient?.age}y / {currentToken?.patient?.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">TOKEN #</span>
                <span className="font-mono font-bold text-blue-700">{currentToken?.token_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">DATE</span>
                <span className="font-bold text-slate-700">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Diagnosis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prescriptionForm.diagnosis}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                  placeholder="e.g. Acute Viral Bronchitis, Mild Hypertension"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Medicines Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Rx: Prescribed Medicines ({prescriptionForm.medicines.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs rounded-lg flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {prescriptionForm.medicines.map((med, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Medicine name & dose"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Dosage (1 tab)"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Freq (1-0-1)"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Instructions"
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Advice & Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dietary Advice / Clinical Notes
                  </label>
                  <textarea
                    rows="2"
                    value={prescriptionForm.clinical_notes}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, clinical_notes: e.target.value })}
                    placeholder="Adequate hydration, avoid cold drinks, steam inhalation..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={prescriptionForm.follow_up_date}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Rx</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPrescriptionModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    Save & Sign Prescription
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
