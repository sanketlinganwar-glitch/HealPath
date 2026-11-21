import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import rateLimit from 'express-rate-limit';
import db from '../database/db.js';
import queueService from '../services/queueService.js';
import whatsappService from '../services/whatsapp.js';
import { generateCheckinQR } from './checkin.js';
import { authenticateToken, authorizeRole } from './auth.js';

const router = express.Router();

/**
 * Rate limiter for payment order creation and verification
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 60, // 60 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment requests, please try again later.' }
});

/**
 * Validate Razorpay Test Mode configuration
 * REFUSES any key that does not start with 'rzp_test_'
 */
export function isRazorpayTestModeConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  return Boolean(keyId && keyId.trim().startsWith('rzp_test_'));
}

export function getRazorpayClient() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (!keyId || !keyId.startsWith('rzp_test_')) {
    console.warn('⚠️ [Razorpay] Refusing initialization: RAZORPAY_KEY_ID must start with "rzp_test_". Only TEST MODE keys allowed.');
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

// Log warning at load time if test keys are missing
if (!isRazorpayTestModeConfigured()) {
  console.warn('⚠️ [Razorpay] Online payments disabled: RAZORPAY_KEY_ID is missing or does not start with "rzp_test_". Defaulting to Hospital Payment only.');
}

/**
 * POST /api/payments/create-order
 * Validates booking details, reserves slot as 'pending_payment' with 10-minute hold,
 * reads consultation_fee from server doctor record, and creates Razorpay Order.
 */
router.post('/create-order', paymentLimiter, async (req, res) => {
  try {
    if (!isRazorpayTestModeConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Online payment is currently unavailable: Razorpay test credentials not configured on server (must start with rzp_test_). Please select Pay at Hospital.'
      });
    }

    const { slot_id, patient_name, age, disease, whatsapp_no, notes, patient_id } = req.body;

    // 1. Validation matching booking requirements
    if (!slot_id || !patient_name || !age || !disease || !whatsapp_no) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID, Patient Name, Age, Disease/Symptoms, and WhatsApp number are required'
      });
    }

    const cleanedPhone = whatsapp_no.trim();
    if (!cleanedPhone.match(/^\+?[1-9]\d{9,14}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid WhatsApp number. Please include valid country code (e.g., +91 9876543210).'
      });
    }

    // 2. Fetch slot
    const slot = db.store.data.slots.find(s => s.id === Number(slot_id));
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot does not exist' });
    }

    if (slot.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked or currently on payment hold. Please choose another slot.'
      });
    }

    // 3. Fetch doctor and verify fee from server record (never trust client)
    const doctor = db.store.data.doctors.find(d => d.id === slot.doctor_id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Assigned doctor not found' });
    }

    const feeInRupees = Number(doctor.consultation_fee);
    if (!doctor.consultation_fee || isNaN(feeInRupees) || feeInRupees <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Online payment is not available for this specialist (no consultation fee configured). Please choose Pay at Hospital.'
      });
    }

    const amountInPaise = Math.round(feeInRupees * 100);
    const io = req.app.get('io');

    // 4. In ONE synchronous block: reserve the slot and create held appointment
    slot.status = 'booked';

    const tokenNo = queueService.generateTokenNumber(slot.doctor_id, slot.date);
    const appointmentId = (db.store.data.appointments.length || 0) + 1;
    const nowIso = new Date().toISOString();
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minute hold

    const appointment = {
      id: appointmentId,
      patient_id: patient_id || (req.user ? req.user.id : null),
      patient_name: patient_name.trim(),
      age: Number(age),
      disease: disease.trim(),
      whatsapp_no: cleanedPhone,
      notes: notes || '',
      slot_id: slot.id,
      token_no: tokenNo,
      doctor_id: slot.doctor_id,
      department_id: doctor.department_id,
      date: slot.date,
      time: slot.start_time,
      source: 'online',
      checked_in: false,
      checked_in_at: null,
      called_at: null,
      started_at: null,
      completed_at: null,
      auto_shifted: false,
      status: 'pending_payment',
      payment_mode: 'online',
      payment_status: 'pending',
      amount: amountInPaise,
      razorpay_order_id: null,
      razorpay_payment_id: null,
      paid_at: null,
      hold_expires_at: holdExpiresAt,
      reminder_sent_at: null,
      reminder_attempts: 0,
      created_at: nowIso
    };

    db.store.data.appointments.push(appointment);
    db.save();

    if (io) {
      io.emit('slot:booked', { slotId: slot.id, doctorId: slot.doctor_id, date: slot.date });
    }

    // 5. Create Razorpay Order via SDK
    const rzp = getRazorpayClient();
    let rzpOrder;
    try {
      rzpOrder = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_appt_${appointmentId}_${Date.now()}`,
        notes: {
          appointment_id: String(appointmentId),
          doctor_id: String(doctor.id),
          doctor_name: doctor.name,
          patient_name: patient_name.trim(),
          slot_date: slot.date,
          slot_time: slot.start_time
        }
      });
    } catch (orderErr) {
      // If order creation fails, release slot immediately!
      console.error('❌ [Razorpay] Order creation failed:', orderErr);
      slot.status = 'available';
      appointment.status = 'cancelled';
      appointment.payment_status = 'failed';
      db.save();

      if (io) {
        io.emit('slot:updated', { slotId: slot.id, status: 'available' });
      }

      return res.status(502).json({
        success: false,
        message: 'Payment gateway order generation failed: ' + (orderErr.error?.description || orderErr.message)
      });
    }

    // 6. Bind order ID to appointment and record payment audit entry
    appointment.razorpay_order_id = rzpOrder.id;

    if (!Array.isArray(db.store.data.payments)) {
      db.store.data.payments = [];
    }

    const paymentAudit = {
      id: (db.store.data.payments.length || 0) + 1,
      appointment_id: appointment.id,
      order_id: rzpOrder.id,
      payment_id: null,
      amount: amountInPaise,
      status: 'created',
      created_at: nowIso,
      raw_event_id: null
    };

    db.store.data.payments.push(paymentAudit);
    db.save();

    res.status(201).json({
      success: true,
      order_id: rzpOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID,
      appointment_id: appointment.id,
      token: tokenNo,
      doctor_name: doctor.name,
      fee_rupees: feeInRupees,
      hold_expires_at: holdExpiresAt
    });

  } catch (err) {
    console.error('Error in /api/payments/create-order:', err);
    res.status(500).json({ success: false, message: 'Internal error creating payment order: ' + err.message });
  }
});

/**
 * POST /api/payments/verify
 * Verifies Razorpay HMAC signature timing-safely, matches held appointment,
 * confirms appointment ('booked'), sets payment_status 'paid', and dispatches confirmations.
 * Idempotent: calling twice returns the exact same successful confirmation.
 */
router.post('/verify', paymentLimiter, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'RAZORPAY_KEY_SECRET is not configured on the server.'
      });
    }

    // 1. Verify HMAC SHA256 of "order_id|payment_id" with crypto.timingSafeEqual
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(razorpay_signature.trim(), 'utf8')
      );
    } catch (sigErr) {
      isValid = false;
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Verification failed.'
      });
    }

    // 2. Find appointment held for this order
    const appt = db.store.data.appointments.find(a => a.razorpay_order_id === razorpay_order_id);
    if (!appt) {
      return res.status(404).json({
        success: false,
        message: 'No appointment found matching this Razorpay order ID.'
      });
    }

    const doctor = db.store.data.doctors.find(d => d.id === appt.doctor_id);
    const department = doctor ? db.store.data.departments.find(dp => dp.id === doctor.department_id) : null;
    const io = req.app.get('io');

    // 3. IDEMPOTENT: If already confirmed and paid, return existing result immediately
    if (appt.status === 'booked' && appt.payment_status === 'paid') {
      let qrDataUrl = null;
      let qrCheckinUrl = null;
      try {
        const qrRes = await generateCheckinQR(appt.token_no);
        qrDataUrl = qrRes.dataUrl;
        qrCheckinUrl = qrRes.checkinUrl;
      } catch (e) {}

      return res.json({
        success: true,
        message: 'Payment verified and appointment confirmed!',
        already_verified: true,
        token: appt.token_no,
        qr: qrDataUrl,
        checkin_url: qrCheckinUrl,
        appointment: {
          ...appt,
          qr: qrDataUrl,
          checkin_url: qrCheckinUrl,
          doctor_name: doctor ? doctor.name : 'Doctor',
          department_name: department ? department.name : 'Department',
          room_no: doctor ? doctor.room_no : '101'
        }
      });
    }

    // 4. Update appointment to confirmed ('booked') and paid
    const nowIso = new Date().toISOString();
    appt.status = 'booked';
    appt.payment_status = 'paid';
    appt.razorpay_payment_id = razorpay_payment_id;
    appt.paid_at = nowIso;
    appt.hold_expires_at = null; // Clear hold timer

    // 5. Add to live queue table now that payment is confirmed
    let qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
    if (!qItem) {
      qItem = {
        id: (db.store.data.queue.length || 0) + 1,
        appointment_id: appt.id,
        token_no: appt.token_no,
        doctor_id: appt.doctor_id,
        department_id: doctor ? doctor.department_id : appt.department_id,
        patient_name: appt.patient_name,
        status: 'waiting',
        position: queueService.calculateQueuePosition(appt.doctor_id, appt.date),
        checked_in_at: null,
        called_at: null,
        started_at: null,
        completed_at: null,
        created_at: nowIso
      };
      db.store.data.queue.push(qItem);
    }

    // 6. Update payment audit record
    if (!Array.isArray(db.store.data.payments)) {
      db.store.data.payments = [];
    }
    const payLog = db.store.data.payments.find(p => p.order_id === razorpay_order_id);
    if (payLog) {
      payLog.payment_id = razorpay_payment_id;
      payLog.status = 'paid';
      payLog.paid_at = nowIso;
    } else {
      db.store.data.payments.push({
        id: (db.store.data.payments.length || 0) + 1,
        appointment_id: appt.id,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: appt.amount,
        status: 'paid',
        created_at: nowIso,
        raw_event_id: null
      });
    }

    db.save();

    // 7. Generate Check-in QR pass
    let qrDataUrl = null;
    let qrCheckinUrl = null;
    try {
      const qrRes = await generateCheckinQR(appt.token_no);
      qrDataUrl = qrRes.dataUrl;
      qrCheckinUrl = qrRes.checkinUrl;
    } catch (e) {
      console.error('Error generating QR for paid booking:', e);
    }

    // 8. Send WhatsApp confirmation asynchronously
    whatsappService.sendBookingConfirmation({
      appointment: appt,
      doctorName: doctor ? doctor.name : 'Doctor',
      io
    }).catch(console.error);

    // 9. Broadcast socket events
    if (io) {
      io.emit('queue:updated', { doctorId: appt.doctor_id });
      io.emit('slot:booked', { slotId: appt.slot_id, doctorId: appt.doctor_id, date: appt.date });
      io.emit('payment:confirmed', { appointmentId: appt.id, orderId: razorpay_order_id });
    }

    res.json({
      success: true,
      message: 'Payment verified and appointment confirmed!',
      token: appt.token_no,
      qr: qrDataUrl,
      checkin_url: qrCheckinUrl,
      appointment: {
        ...appt,
        qr: qrDataUrl,
        checkin_url: qrCheckinUrl,
        doctor_name: doctor ? doctor.name : 'Doctor',
        department_name: department ? department.name : 'Department',
        room_no: doctor ? doctor.room_no : '101'
      }
    });

  } catch (err) {
    console.error('Error in /api/payments/verify:', err);
    res.status(500).json({ success: false, message: 'Verification error: ' + err.message });
  }
});

/**
 * POST /api/payments/release-hold
 * Explicitly releases a payment hold if user cancels or dismisses checkout popup
 */
router.post('/release-hold', async (req, res) => {
  try {
    const { appointment_id, order_id } = req.body;
    if (!appointment_id && !order_id) {
      return res.status(400).json({ success: false, message: 'appointment_id or order_id is required' });
    }

    const appt = db.store.data.appointments.find(a => 
      (appointment_id && a.id === Number(appointment_id)) ||
      (order_id && a.razorpay_order_id === order_id)
    );

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Only release if still in pending_payment
    if (appt.status === 'pending_payment') {
      appt.status = 'cancelled';
      appt.payment_status = 'failed';

      const slot = db.store.data.slots.find(s => s.id === appt.slot_id);
      if (slot) {
        slot.status = 'available';
      }

      const payRecord = db.store.data.payments?.find(p => p.order_id === appt.razorpay_order_id);
      if (payRecord && payRecord.status === 'created') {
        payRecord.status = 'cancelled';
      }

      db.save();

      const io = req.app.get('io');
      if (io && slot) {
        io.emit('slot:updated', { slotId: slot.id, status: 'available' });
      }

      return res.json({ success: true, message: 'Payment hold released successfully. Slot is available again.' });
    }

    return res.json({ success: false, message: `Cannot release hold: appointment status is ${appt.status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/payments/webhook
 * Handled with raw Buffer body mounted before express.json() in server.js
 * Verifies X-Razorpay-Signature with RAZORPAY_WEBHOOK_SECRET
 * Handles payment.captured and payment.failed, ignores duplicate events.
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      console.warn('⚠️ [Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured on server.');
      return res.status(400).send('Webhook secret not configured');
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).send('Missing X-Razorpay-Signature header');
    }

    const rawBody = req.body; // Buffer from express.raw()
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSig, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch (e) {
      isValid = false;
    }

    if (!isValid) {
      return res.status(400).send('Invalid webhook signature');
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      return res.status(400).send('Malformed JSON payload');
    }

    const eventId = event.event_id || event.id || req.headers['x-razorpay-event-id'];
    if (eventId && db.store.data.payments?.some(p => p.raw_event_id === eventId)) {
      console.log(`ℹ️ [Webhook] Duplicate Razorpay event ignored: ${eventId}`);
      return res.status(200).json({ status: 'duplicate_ignored' });
    }

    const io = req.app.get('io');

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const appt = db.store.data.appointments.find(a => a.razorpay_order_id === orderId);
        if (appt && appt.status !== 'booked') {
          appt.status = 'booked';
          appt.payment_status = 'paid';
          appt.razorpay_payment_id = paymentId;
          appt.paid_at = new Date().toISOString();
          appt.hold_expires_at = null;

          let qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
          if (!qItem) {
            qItem = {
              id: (db.store.data.queue.length || 0) + 1,
              appointment_id: appt.id,
              token_no: appt.token_no,
              doctor_id: appt.doctor_id,
              department_id: appt.department_id,
              patient_name: appt.patient_name,
              status: 'waiting',
              position: queueService.calculateQueuePosition(appt.doctor_id, appt.date),
              checked_in_at: null,
              called_at: null,
              started_at: null,
              completed_at: null,
              created_at: new Date().toISOString()
            };
            db.store.data.queue.push(qItem);
          }

          if (!Array.isArray(db.store.data.payments)) db.store.data.payments = [];
          db.store.data.payments.push({
            id: (db.store.data.payments.length || 0) + 1,
            appointment_id: appt.id,
            order_id: orderId,
            payment_id: paymentId,
            amount: paymentEntity.amount || appt.amount,
            status: 'paid',
            created_at: new Date().toISOString(),
            raw_event_id: eventId
          });

          db.save();

          const doctor = db.store.data.doctors.find(d => d.id === appt.doctor_id);
          whatsappService.sendBookingConfirmation({
            appointment: appt,
            doctorName: doctor ? doctor.name : 'Doctor',
            io
          }).catch(console.error);

          if (io) {
            io.emit('queue:updated', { doctorId: appt.doctor_id });
            io.emit('payment:confirmed', { appointmentId: appt.id, orderId });
          }
        }
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        const appt = db.store.data.appointments.find(a => a.razorpay_order_id === orderId);
        if (appt && appt.status === 'pending_payment') {
          appt.payment_status = 'failed';
          // Keep hold until expiry so patient has a chance to retry before release
          if (!Array.isArray(db.store.data.payments)) db.store.data.payments = [];
          db.store.data.payments.push({
            id: (db.store.data.payments.length || 0) + 1,
            appointment_id: appt.id,
            order_id: orderId,
            payment_id: paymentEntity?.id || null,
            amount: paymentEntity?.amount || appt.amount,
            status: 'failed',
            created_at: new Date().toISOString(),
            raw_event_id: eventId
          });
          db.save();
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook handler error: ' + err.message);
  }
});

/**
 * GET /api/payments/status/:id
 * Check payment and hold status for an appointment
 */
router.get('/status/:id', (req, res) => {
  const appt = db.store.data.appointments.find(a => a.id === Number(req.params.id));
  if (!appt) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  res.json({
    success: true,
    appointment_id: appt.id,
    token_no: appt.token_no,
    status: appt.status,
    payment_mode: appt.payment_mode,
    payment_status: appt.payment_status,
    amount: appt.amount,
    hold_expires_at: appt.hold_expires_at,
    paid_at: appt.paid_at
  });
});

export default router;
