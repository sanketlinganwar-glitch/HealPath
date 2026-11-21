import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function QRCodeCard({
  value,
  tokenNumber,
  patientName,
  departmentName,
  doctorName,
  room,
  appointmentCode,
  isAppointment = false
}) {
  const canvasRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: 180,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('Error generating QR:', error);
      });
    }
  }, [value]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `HealPath-${isAppointment ? appointmentCode : tokenNumber}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl max-w-sm mx-auto text-center space-y-4 print:shadow-none print:border-none">
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-1.5 text-teal-700 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>HealPath Verified</span>
        </div>
        <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
          {isAppointment ? 'APPOINTMENT' : 'OPD TOKEN'}
        </span>
      </div>

      {/* Token / Appointment Code */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {isAppointment ? t('appointmentCode') : t('yourToken')}
        </p>
        <p className="text-4xl font-black text-slate-900 tracking-tight font-mono">
          {isAppointment ? appointmentCode : tokenNumber}
        </p>
      </div>

      {/* Patient & Clinic Details */}
      <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1 text-slate-700 border border-slate-100">
        <div className="flex justify-between font-medium">
          <span className="text-slate-500">Patient:</span>
          <span className="font-bold text-slate-900">{patientName}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-slate-500">Department:</span>
          <span className="font-semibold text-teal-700">{departmentName}</span>
        </div>
        {doctorName && (
          <div className="flex justify-between font-medium">
            <span className="text-slate-500">Doctor:</span>
            <span className="font-semibold">{doctorName}</span>
          </div>
        )}
        {room && (
          <div className="flex justify-between font-medium">
            <span className="text-slate-500">Cabin / Room:</span>
            <span className="font-bold text-slate-800">{room}</span>
          </div>
        )}
      </div>

      {/* Canvas QR Code */}
      <div className="flex flex-col items-center justify-center p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
        <canvas ref={canvasRef} className="rounded-xl shadow-xs" />
        <p className="text-[11px] text-slate-500 font-medium mt-2 flex items-center space-x-1">
          <QrCode className="w-3.5 h-3.5 text-slate-400" />
          <span>{t('scanQr')}</span>
        </p>
      </div>

      {/* Action Buttons (Hidden on Print) */}
      <div className="flex items-center justify-center space-x-2 pt-1 print:hidden">
        <button
          onClick={handleDownload}
          className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('downloadToken')}</span>
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>
    </div>
  );
}
