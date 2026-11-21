import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import db from '../database/db.js';
import queueService from '../services/queueService.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();
const QR_SECRET = process.env.QR_SECRET || 'healpath_qr_checkin_secret_key_2026';

/**
 * Generate HMAC SHA-256 signature for a token
 */
export function generateTokenSignature(token) {
  if (!token) return '';
  return crypto.createHmac('sha256', QR_SECRET).update(token.toString().trim()).digest('hex');
}

/**
 * Timing-safe signature verification
 */
export function verifyTokenSignature(token, sig) {
  if (!token || !sig) return false;
  const expected = generateTokenSignature(token);
  if (typeof sig !== 'string' || expected.length !== sig.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
  } catch (err) {
    return false;
  }
}

/**
 * Generate QR PNG data URL for check-in
 * Payload format: /checkin.html?token=<TOKEN>&sig=<HMAC>
 */
export async function generateCheckinQR(token) {
  const cleanToken = token.toString().trim();
  const sig = generateTokenSignature(cleanToken);
  const checkinUrl = `/checkin.html?token=${encodeURIComponent(cleanToken)}&sig=${encodeURIComponent(sig)}`;

  const dataUrl = await QRCode.toDataURL(checkinUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0F3B64', // HealPath Deep Blue
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
  });

  return { dataUrl, sig, checkinUrl };
}

/**
 * Handler for GET /api/appointments/:token/qr
 * Returns a PNG data URL of the QR code
 */
export async function getAppointmentQRHandler(req, res) {
  try {
    const rawToken = req.params.token;
    if (!rawToken) {
      return res.status(400).json({ success: false, message: 'Token parameter is required' });
    }

    const token = decodeURIComponent(rawToken).trim();
    const appt = db.store.data.appointments.find(
      a => a.token_no && a.token_no.toUpperCase() === token.toUpperCase()
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found for token' });
    }

    const { dataUrl, sig, checkinUrl } = await generateCheckinQR(appt.token_no);

    // If text/plain requested specifically
    if (req.query.format === 'text' || req.headers.accept === 'text/plain') {
      return res.type('text/plain').send(dataUrl);
    }

    return res.json({
      success: true,
      token: appt.token_no,
      qr: dataUrl,
      dataUrl: dataUrl,
      sig,
      checkin_url: checkinUrl,
      patient_name: appt.patient_name,
      doctor_id: appt.doctor_id,
      date: appt.date,
      time: appt.time,
      status: appt.status,
      checked_in: appt.checked_in
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/appointments/:token/qr when checkin router handles /api/appointments
router.get('/appointments/:token/qr', getAppointmentQRHandler);
router.get('/:token/qr', getAppointmentQRHandler);

// GET /api/checkin/qr/:id (by Appointment ID or Token)
router.get('/qr/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const appt = db.store.data.appointments.find(a => 
      String(a.id) === String(param) || (a.token_no && a.token_no.toUpperCase() === param.toUpperCase())
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const { dataUrl, sig, checkinUrl } = await generateCheckinQR(appt.token_no);

    if (req.headers.accept?.includes('text/html')) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Check-in Pass | ${appt.token_no}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #0F3B64; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
            .card { background: #FFFFFF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); padding: 2rem; max-width: 360px; width: 100%; text-align: center; border-top: 4px solid #14BBA6; }
            .token { font-size: 1.8rem; font-weight: 800; color: #14BBA6; margin: 0.5rem 0; letter-spacing: 0.05em; }
            .details { font-size: 0.9rem; color: #475569; margin: 0.75rem 0 1.5rem; }
            .qr-img { width: 220px; height: 220px; margin: 0 auto 1.5rem; display: block; border-radius: 8px; border: 1px solid #E2E8F0; }
            .btn { display: block; width: 100%; box-sizing: border-box; background: #14BBA6; color: #FFF; text-decoration: none; padding: 0.85rem; border-radius: 8px; font-weight: 700; }
            .btn:hover { background: #0D9488; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="margin: 0; color: #0F3B64;">Sanjeevan Hospital</h3>
            <div style="font-size: 0.75rem; color: #64748B; text-transform: uppercase; margin-top: 4px;">OPD Check-in Pass</div>
            <div class="token">${appt.token_no}</div>
            <div class="details">
              <strong>${appt.patient_name}</strong><br>
              Slot: ${appt.date} at ${appt.time}
            </div>
            <img class="qr-img" src="${dataUrl}" alt="Check-in QR Code">
            <a class="btn" href="${checkinUrl}">Self Check-In Now</a>
          </div>
        </body>
        </html>
      `);
    }

    return res.json({
      success: true,
      token: appt.token_no,
      checkin_url: checkinUrl,
      qr: dataUrl,
      sig
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Core Arrival Verification Logic
 */
async function processArrivalCheckIn(cleanToken, io) {
  // 1. Lookup appointment by token
  const appt = db.store.data.appointments.find(
    a => a.token_no && a.token_no.toUpperCase() === cleanToken.toUpperCase()
  );

  if (!appt) {
    return { status: 404, data: { success: false, message: 'Unknown token: appointment not found for this pass' } };
  }

  // 2. Check if slot is missed or cancelled
  if (appt.status === 'missed' || appt.status === 'cancelled') {
    return {
      status: 410,
      data: {
        success: false,
        message: `Appointment slot has been ${appt.status}. Please visit reception to reschedule your turn.`
      }
    };
  }

  // 3. Check if appointment is in pending_payment status
  if (appt.status === 'pending_payment') {
    return {
      status: 400,
      data: {
        success: false,
        message: 'Cannot check in: online payment for this appointment is still pending.'
      }
    };
  }

  // 4. Check if already checked in
  if (appt.checked_in || appt.status === 'checked_in' || appt.status === 'in_consultation' || appt.status === 'completed') {
    return {
      status: 409,
      data: {
        success: false,
        message: 'Patient is already checked in and in the consultation queue.'
      }
    };
  }

  // 5. Execute check-in logic (halts 10-minute missed-slot countdown)
  const updated = await queueService.checkInAppointment(appt.id, io);
  const doctor = db.store.data.doctors.find(d => d.id === appt.doctor_id);
  const department = doctor ? db.store.data.departments.find(dp => dp.id === doctor.department_id) : null;

  // 6. Emit Socket.io event "patient:checkedin"
  if (io) {
    io.emit('patient:checkedin', {
      appointmentId: appt.id,
      token: appt.token_no,
      tokenNo: appt.token_no,
      patientName: appt.patient_name,
      doctorName: doctor ? doctor.name : 'Doctor',
      departmentName: department ? department.name : 'General',
      roomNo: doctor ? doctor.room_no : '101',
      time: appt.time,
      date: appt.date,
      checkedInAt: new Date().toISOString()
    });
  }

  return {
    status: 200,
    data: {
      success: true,
      message: 'Patient successfully checked in! Arrival confirmed and timer halted.',
      token: appt.token_no,
      appointment: updated,
      patient: {
        name: appt.patient_name,
        token: appt.token_no,
        doctor: doctor ? doctor.name : 'Doctor',
        department: department ? department.name : 'General OPD',
        room: doctor ? doctor.room_no : '101',
        time: appt.time,
        date: appt.date
      }
    }
  };
}

/**
 * POST /api/checkin/self-verify
 * Public endpoint for QR-code scanner (kiosk or patient mobile camera)
 * Validates HMAC signature without requiring receptionist login.
 */
router.post('/self-verify', async (req, res) => {
  try {
    const { token, sig } = req.body;
    if (!token || !sig) {
      return res.status(400).json({ success: false, message: 'Token and cryptographic signature are required' });
    }

    const cleanToken = token.toString().trim();
    const cleanSig = sig.toString().trim();

    if (!verifyTokenSignature(cleanToken, cleanSig)) {
      return res.status(400).json({ success: false, message: 'Invalid or tampered QR pass signature' });
    }

    const result = await processArrivalCheckIn(cleanToken, req.app.get('io'));
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/checkin/manual-verify
 * Manual verification fallback by Token Number and optional phone.
 */
router.post('/manual-verify', async (req, res) => {
  try {
    const { token, phone } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token number is required' });
    }

    const cleanToken = token.toString().trim().toUpperCase();
    const appt = db.store.data.appointments.find(
      a => a.token_no && a.token_no.toUpperCase() === cleanToken
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: 'No appointment found matching token number: ' + cleanToken });
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const apptPhone = (appt.whatsapp_no || '').replace(/\D/g, '').slice(-10);
      if (cleanPhone && apptPhone && cleanPhone !== apptPhone) {
        return res.status(400).json({ success: false, message: 'Mobile number does not match registered token records.' });
      }
    }

    const result = await processArrivalCheckIn(cleanToken, req.app.get('io'));
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/checkin/scan
 * Staff / Reception barcode scanner check-in with JWT protection.
 */
router.post('/scan', authenticateToken, authorizeRole('receptionist', 'admin'), async (req, res) => {
  try {
    const { token, sig } = req.body;
    if (!token || !sig) {
      return res.status(400).json({
        success: false,
        message: 'Token and signature are required'
      });
    }

    const cleanToken = token.toString().trim();
    const cleanSig = sig.toString().trim();

    // 1. Verify HMAC signature
    if (!verifyTokenSignature(cleanToken, cleanSig)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature or tampered QR code'
      });
    }

    const result = await processArrivalCheckIn(cleanToken, req.app.get('io'));
    return res.status(result.status).json(result.data);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
