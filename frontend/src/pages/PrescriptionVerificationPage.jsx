import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  FileText,
  Calendar,
  Lock,
  ArrowLeft,
  Building2,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import { verifyPrescriptionToken } from '../api/client';

export function PrescriptionVerificationPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (tok) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await verifyPrescriptionToken(tok);
      setData(res);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail ||
          'This prescription verification token was not found in the hospital registry or has been revoked.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-100 pb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Activity className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Prescription Integrity Verification
          </h2>
          <p className="text-xs text-slate-500">
            Sanjeevan Multispecialty Hospital & Research Institute, Yavatmal
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-600">
              Validating cryptographic signature in hospital registry...
            </p>
          </div>
        ) : errorMsg || !data ? (
          <div className="space-y-5 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-rose-700">Invalid or Revoked Prescription</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {errorMsg || 'The cryptographic token scanned does not correspond to an active clinical record.'}
              </p>
            </div>

            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-rose-800">Security Guidance</p>
              <p>Please present the physical prescription to the dispensary or contact hospital administration:</p>
              <p className="font-mono font-bold text-rose-900 pt-1">Casualty Helpline: +91 95526 25262</p>
            </div>

            <Link
              to="/"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Hospital Home</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Valid Badge */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border border-emerald-300 rounded-2xl flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                    VERIFIED AUTHENTIC
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {data.prescription_number}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-semibold mt-1">
                  Issued by authorized medical officer at Sanjeevan Hospital.
                </p>
              </div>
            </div>

            {/* Verification Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  Attending Doctor
                </span>
                <p className="font-bold text-slate-900 text-sm">{data.doctor_name}</p>
                <p className="text-slate-600 font-medium">{data.doctor_qualification}</p>
                <p className="text-emerald-700 font-semibold">Reg: {data.doctor_registration}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  Department & Facility
                </span>
                <p className="font-bold text-slate-900 text-sm">{data.department_name}</p>
                <p className="text-slate-600 truncate">{data.hospital_name}</p>
                <p className="text-slate-500">Yavatmal, Maharashtra</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  Issue Date
                </span>
                <p className="font-bold text-slate-900 text-sm">{data.issued_date}</p>
                <p className="text-slate-500">Clinical Status: <span className="font-semibold text-emerald-700 capitalize">{data.status}</span></p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  Digital Signature
                </span>
                <p className="font-bold text-slate-900 text-sm flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clinically Signed</span>
                </p>
                <p className="text-slate-500">Sign Time: {data.signed_at ? new Date(data.signed_at).toLocaleTimeString() : 'Recorded'}</p>
              </div>
            </div>

            {/* Cryptographic Digest Box */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1 font-mono text-[11px]">
              <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                Cryptographic Signature Digest
              </span>
              <p className="break-all text-slate-300 font-mono select-all">
                {data.signature_hash}
              </p>
            </div>

            {/* Patient Privacy Compliance Notice */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-blue-700" />
                <span>Patient Privacy & DPDP Notice</span>
              </p>
              <p className="text-slate-600 leading-relaxed">
                In strict compliance with patient confidentiality regulations, patient identity, personal contact details, and clinical diagnosis are withheld from public QR verification checks. Authorized patients can view full records inside their Digital Health Wallet.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Link
                to="/"
                className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Hospital Home</span>
              </Link>

              <Link
                to="/patient/dashboard"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Access Health Wallet</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
