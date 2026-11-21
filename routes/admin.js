import express from 'express';
import Razorpay from 'razorpay';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from './auth.js';
import { sendAppointmentReminder } from '../services/reminders.js';
import {
  getKolkataTime,
  isValidDateStr,
  shiftKolkataDate,
  getDaysDifference,
  getDateRangeArray
} from '../services/time.js';

const router = express.Router();

// GET /api/admin/dashboard (Dashboard counters)
router.get('/dashboard', (req, res) => {
  const doctors = db.store.data.doctors || [];
  const users = db.store.data.users || [];
  const appts = db.store.data.appointments || [];
  const queue = db.store.data.queue || [];
  const messages = db.store.data.messages || [];

  const patients = users.filter(u => u.role === 'patient');
  const staff = users.filter(u => u.role === 'doctor' || u.role === 'receptionist' || u.role === 'admin');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayAppts = appts.filter(a => a.date === todayStr);

  const pendingQueue = queue.filter(q => q.status === 'waiting');
  const inProgressQueue = queue.filter(q => q.status === 'in_progress');
  const completedQueue = queue.filter(q => q.status === 'completed');

  res.json({
    success: true,
    stats: {
      total_staff: staff.length + doctors.length,
      total_doctors: doctors.length,
      total_patients: patients.length,
      today_appointments: todayAppts.length,
      pending_queue: pendingQueue.length,
      in_progress: inProgressQueue.length,
      completed_today: completedQueue.length,
      total_messages_sent: messages.length,
      settings: db.store.data.settings
    }
  });
});

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  res.json({
    success: true,
    settings: db.store.data.settings
  });
});

// PATCH /api/admin/settings (Update slot duration & grace period & reminder window)
router.patch('/settings', (req, res) => {
  const { slot_duration_min, grace_period_min, reminder_minutes_before, hospital_name, hospital_phone, hospital_email } = req.body;

  if (slot_duration_min) {
    db.store.data.settings.slot_duration_min = String(slot_duration_min);
  }
  if (grace_period_min) {
    db.store.data.settings.grace_period_min = String(grace_period_min);
  }
  if (reminder_minutes_before !== undefined) {
    const val = Number(reminder_minutes_before);
    if (!isNaN(val) && val >= 5 && val <= 1440) {
      db.store.data.settings.reminder_minutes_before = String(val);
    } else {
      return res.status(400).json({ success: false, message: 'reminder_minutes_before must be between 5 and 1440 minutes' });
    }
  }
  if (hospital_name) {
    db.store.data.settings.hospital_name = hospital_name;
  }
  if (hospital_phone) {
    db.store.data.settings.hospital_phone = hospital_phone;
  }
  if (hospital_email) {
    db.store.data.settings.hospital_email = hospital_email;
  }

  db.save();

  res.json({
    success: true,
    message: 'Hospital settings updated successfully',
    settings: db.store.data.settings
  });
});

// POST /api/admin/doctors (Add new doctor)
router.post('/doctors', (req, res) => {
  const { name, department_id, specialty, qualification, experience_years, room_no, consultation_fee, start_hour, end_hour } = req.body;

  if (!name || !department_id || !specialty) {
    return res.status(400).json({ success: false, message: 'Doctor name, department and specialty are required' });
  }

  const newDoc = {
    id: (db.store.data.doctors.length || 0) + 1,
    department_id: Number(department_id),
    name,
    specialty,
    qualification: qualification || 'MBBS, MD',
    experience_years: Number(experience_years) || 5,
    room_no: room_no || `Room ${100 + (db.store.data.doctors.length + 1)}`,
    consultation_fee: Number(consultation_fee) || 500,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    start_hour: start_hour || '09:00',
    end_hour: end_hour || '14:00',
    status: 'available',
    leave_days: []
  };

  db.store.data.doctors.push(newDoc);
  db.save();

  res.status(201).json({ success: true, message: 'Doctor added successfully', doctor: newDoc });
});

// PUT /api/admin/doctors/:id (Admin-only full profile update)
router.put('/doctors/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.store.data.doctors.find(d => d.id === docId);

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  const {
    name,
    specialization,
    specialty,
    department_id,
    room,
    room_no,
    qualification,
    experience_years,
    languages,
    bio,
    consultation_fee,
    photo_url,
    avatar,
    opd_days,
    opd_hours
  } = req.body;

  // Validation: consultation_fee >= 0
  if (consultation_fee !== undefined && consultation_fee !== null && consultation_fee !== '') {
    const fee = Number(consultation_fee);
    if (isNaN(fee) || fee < 0) {
      return res.status(400).json({ success: false, message: 'Consultation fee must be a number greater than or equal to 0' });
    }
    doc.consultation_fee = fee;
  } else if (consultation_fee === null || consultation_fee === '') {
    doc.consultation_fee = null;
  }

  // Validation: experience_years integer 0..70
  if (experience_years !== undefined && experience_years !== null && experience_years !== '') {
    const exp = Number(experience_years);
    if (isNaN(exp) || !Number.isInteger(exp) || exp < 0 || exp > 70) {
      return res.status(400).json({ success: false, message: 'Experience years must be an integer between 0 and 70' });
    }
    doc.experience_years = exp;
  } else if (experience_years === null || experience_years === '') {
    doc.experience_years = null;
  }

  // Validation: languages is an array of strings
  if (languages !== undefined && languages !== null) {
    if (!Array.isArray(languages) || languages.some(l => typeof l !== 'string')) {
      return res.status(400).json({ success: false, message: 'Languages must be an array of strings' });
    }
    doc.languages = languages;
  }

  // Validation: photo_url starts with http://, https://, or /
  const candidatePhoto = photo_url || avatar;
  if (candidatePhoto !== undefined && candidatePhoto !== null && candidatePhoto !== '') {
    if (!candidatePhoto.startsWith('http://') && !candidatePhoto.startsWith('https://') && !candidatePhoto.startsWith('/')) {
      return res.status(400).json({ success: false, message: 'Photo URL must start with http://, https://, or /' });
    }
    doc.photo_url = candidatePhoto;
    doc.avatar = candidatePhoto;
    doc.image_url = candidatePhoto;
  } else if (candidatePhoto === null || candidatePhoto === '') {
    doc.photo_url = null;
  }

  // Other fields
  if (name !== undefined && typeof name === 'string' && name.trim()) {
    doc.name = name.trim();
  }
  if (department_id !== undefined && department_id !== null) {
    doc.department_id = Number(department_id);
    const dept = db.store.data.departments.find(d => d.id === doc.department_id);
    if (dept) doc.department_name = dept.name;
  }
  if (qualification !== undefined) {
    doc.qualification = typeof qualification === 'string' ? qualification.trim() : null;
  }
  if (bio !== undefined) {
    doc.bio = typeof bio === 'string' ? bio.trim() : null;
  }
  if (opd_days !== undefined) {
    doc.opd_days = typeof opd_days === 'string' ? opd_days.trim() : null;
  }
  if (opd_hours !== undefined) {
    doc.opd_hours = typeof opd_hours === 'string' ? opd_hours.trim() : null;
    if (doc.opd_hours && doc.opd_hours.includes('-')) {
      const [s, e] = doc.opd_hours.split('-');
      doc.working_start = s.trim();
      doc.working_end = e.trim();
      doc.start_hour = s.trim();
      doc.end_hour = e.trim();
    }
  }

  const newRoom = room || room_no;
  if (newRoom !== undefined) {
    doc.room = typeof newRoom === 'string' ? newRoom.trim() : doc.room;
    doc.room_no = doc.room;
  }

  const newSpec = specialization || specialty;
  if (newSpec !== undefined) {
    doc.specialization = typeof newSpec === 'string' ? newSpec.trim() : doc.specialization;
    doc.specialty = doc.specialization;
  }

  db.save();

  // Emit real-time notification
  if (req.app.get('io')) {
    req.app.get('io').emit('doctor:profile_updated', { doctorId: docId });
  }

  res.json({
    success: true,
    message: 'Doctor profile updated successfully',
    doctor: doc
  });
});

// GET /api/admin/payments (List all online payments with appointment and refund info)
router.get('/payments', authenticateToken, authorizeRole('admin', 'receptionist'), (req, res) => {
  const payments = db.store.data.payments || [];
  const appointments = db.store.data.appointments || [];
  const doctors = db.store.data.doctors || [];

  const enriched = payments.map(p => {
    const appt = appointments.find(a => a.id === p.appointment_id || (p.order_id && a.razorpay_order_id === p.order_id));
    const doc = appt ? doctors.find(d => d.id === appt.doctor_id) : null;
    return {
      ...p,
      patient_name: appt?.patient_name || 'N/A',
      whatsapp_no: appt?.whatsapp_no || 'N/A',
      token_no: appt?.token_no || 'N/A',
      slot_date: appt?.date || 'N/A',
      slot_time: appt?.time || 'N/A',
      doctor_name: doc?.name || 'N/A',
      appointment_status: appt?.status || 'N/A',
      payment_status: appt?.payment_status || p.status,
      can_refund: Boolean(
        (appt?.payment_status === 'refund_due' || appt?.payment_status === 'paid' || p.status === 'paid') &&
        (p.payment_id || appt?.razorpay_payment_id) &&
        p.status !== 'refunded' &&
        appt?.payment_status !== 'refunded'
      )
    };
  });

  enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    success: true,
    count: enriched.length,
    payments: enriched
  });
});

// POST /api/admin/payments/:id/refund (Admin-only: execute Razorpay refund)
router.post('/payments/:id/refund', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const paramId = req.params.id;
    const payments = db.store.data.payments || [];
    const appointments = db.store.data.appointments || [];

    const payRecord = payments.find(p => String(p.id) === String(paramId) || String(p.appointment_id) === String(paramId) || p.order_id === paramId);
    const appt = appointments.find(a => 
      (payRecord && a.id === payRecord.appointment_id) || 
      String(a.id) === String(paramId) ||
      (payRecord && a.razorpay_order_id === payRecord.order_id)
    );

    if (!payRecord && !appt) {
      return res.status(404).json({ success: false, message: 'Payment or appointment record not found' });
    }

    const paymentId = payRecord?.payment_id || appt?.razorpay_payment_id;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: 'Cannot process refund: No Razorpay payment ID associated with this record.' });
    }

    if (appt?.payment_status === 'refunded' || payRecord?.status === 'refunded') {
      return res.status(400).json({ success: false, message: 'Payment has already been refunded.' });
    }

    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

    if (!keyId.startsWith('rzp_test_')) {
      return res.status(503).json({ success: false, message: 'Refunds disabled: Server is not configured with Razorpay test keys (must start with rzp_test_).' });
    }

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const refundAmount = payRecord?.amount || appt?.amount || 0;

    let refundRes;
    try {
      refundRes = await rzp.payments.refund(paymentId, {
        amount: refundAmount,
        notes: {
          reason: 'Appointment cancellation / Admin refund',
          appointment_id: appt ? String(appt.id) : '',
          token_no: appt ? appt.token_no : ''
        }
      });
    } catch (refErr) {
      console.error('[Razorpay Refund Error]', refErr);
      return res.status(502).json({
        success: false,
        message: 'Razorpay refund failed: ' + (refErr.error?.description || refErr.message)
      });
    }

    const nowIso = new Date().toISOString();
    if (payRecord) {
      payRecord.status = 'refunded';
      payRecord.refund_id = refundRes.id;
      payRecord.refunded_at = nowIso;
    }
    if (appt) {
      appt.payment_status = 'refunded';
    }

    db.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('payment:refunded', { appointmentId: appt?.id, refundId: refundRes.id });
    }

    res.json({
      success: true,
      message: 'Refund executed successfully via Razorpay!',
      refund: refundRes
    });
  } catch (err) {
    console.error('Error executing refund:', err);
    res.status(500).json({ success: false, message: 'Server error processing refund: ' + err.message });
  }
});

// GET /api/admin/analytics (Admin-only analytics and KPI aggregations)
router.get('/analytics', authenticateToken, authorizeRole('admin'), (req, res) => {
  try {
    const { from: qFrom, to: qTo, doctor_id: qDocId, department_id: qDeptId } = req.query;

    const { dateStr: todayKolkata } = getKolkataTime();

    // Default range: last 7 days (today and 6 previous days)
    const to = qTo ? String(qTo).trim() : todayKolkata;
    const from = qFrom ? String(qFrom).trim() : shiftKolkataDate(to, -6);

    // Validate date format YYYY-MM-DD
    if (!isValidDateStr(from) || !isValidDateStr(to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format for 'from' or 'to'. Expected YYYY-MM-DD format."
      });
    }

    if (from > to) {
      return res.status(400).json({
        success: false,
        message: "'from' date must be earlier than or equal to 'to' date."
      });
    }

    const daysCount = getDaysDifference(from, to);
    if (daysCount > 90) {
      return res.status(400).json({
        success: false,
        message: "Date range exceeds maximum allowed limit of 90 days."
      });
    }

    const filterDoctorId = qDocId !== undefined && qDocId !== '' ? Number(qDocId) : null;
    const filterDeptId = qDeptId !== undefined && qDeptId !== '' ? Number(qDeptId) : null;

    const appointments = db.store.data.appointments || [];
    const doctors = db.store.data.doctors || [];
    const departments = db.store.data.departments || [];
    const messages = db.store.data.messages || [];

    // 1. Build zero-filled daily buckets
    const dateRangeList = getDateRangeArray(from, to);
    const dailyMap = new Map();
    dateRangeList.forEach(d => {
      dailyMap.set(d, { date: d, booked: 0, completed: 0, cancelled: 0, missed: 0 });
    });

    // 2. Build 24 peak hour buckets (0 to 23)
    const peakHours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

    // 3. Pre-index doctor maps for O(1) single pass lookup
    const docStatsMap = new Map();
    doctors.forEach(d => {
      docStatsMap.set(d.id, {
        id: d.id,
        name: d.name,
        department_id: d.department_id,
        department_name: departments.find(dp => dp.id === d.department_id)?.name || 'General',
        total: 0,
        completed: 0,
        missed: 0,
        wait_times: [],
        consult_times: []
      });
    });

    // 4. Pre-index department maps for O(1) single pass lookup
    const deptStatsMap = new Map();
    departments.forEach(dp => {
      deptStatsMap.set(dp.id, {
        id: dp.id,
        name: dp.name,
        total: 0,
        completed: 0,
        missed: 0,
        wait_times: [],
        consult_times: []
      });
    });

    // 5. Summary metrics accumulation
    let totalBookings = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let missedCount = 0;
    let autoShiftedCount = 0;
    let walkInsCount = 0;

    const sources = {
      online: 0,
      walk_in: 0,
      auto_shifted: 0
    };

    const overallWaitTimes = [];
    const overallConsultTimes = [];

    // SINGLE PASS over appointments
    for (let i = 0; i < appointments.length; i++) {
      const a = appointments[i];

      // Ignore pending payment holds from analytics
      if (a.status === 'pending_payment') continue;

      // Date range filtering
      if (!a.date || a.date < from || a.date > to) continue;

      // Optional Doctor ID filter
      if (filterDoctorId !== null && a.doctor_id !== filterDoctorId) continue;

      // Optional Department ID filter
      const aDeptId = a.department_id || (docStatsMap.get(a.doctor_id)?.department_id);
      if (filterDeptId !== null && aDeptId !== filterDeptId) continue;

      totalBookings++;

      // Daily bucket update
      const dayBucket = dailyMap.get(a.date);
      if (dayBucket) {
        dayBucket.booked++;
      }

      // Status updates
      const st = a.status ? a.status.toLowerCase() : 'booked';
      const isCompleted = st === 'completed';
      const isCancelled = st === 'cancelled';
      const isMissed = st === 'missed';
      const isAutoShifted = Boolean(a.auto_shifted) || st === 'rescheduled';
      const isWalkIn = a.source === 'walk_in';

      if (isCompleted) {
        completedCount++;
        if (dayBucket) dayBucket.completed++;
      }
      if (isCancelled) {
        cancelledCount++;
        if (dayBucket) dayBucket.cancelled++;
      }
      if (isMissed) {
        missedCount++;
        if (dayBucket) dayBucket.missed++;
      }
      if (isAutoShifted) {
        autoShiftedCount++;
      }
      if (isWalkIn) {
        walkInsCount++;
      }

      // Booking sources split
      if (isAutoShifted) {
        sources.auto_shifted++;
      } else if (isWalkIn) {
        sources.walk_in++;
      } else {
        sources.online++;
      }

      // Peak hours (parse hour from a.time)
      if (a.time) {
        const timePart = a.time.trim();
        const hourMatch = timePart.match(/^(\d{1,2})/);
        if (hourMatch) {
          let h = parseInt(hourMatch[1], 10);
          if (timePart.toLowerCase().includes('pm') && h < 12) h += 12;
          if (timePart.toLowerCase().includes('am') && h === 12) h = 0;
          if (h >= 0 && h < 24) {
            peakHours[h].count++;
          }
        }
      }

      // Wait time calculation: called_at minus checked_in_at
      let waitMin = null;
      if (a.called_at && a.checked_in_at) {
        const cMs = new Date(a.called_at).getTime();
        const inMs = new Date(a.checked_in_at).getTime();
        if (!isNaN(cMs) && !isNaN(inMs) && cMs >= inMs) {
          waitMin = (cMs - inMs) / 60000;
          overallWaitTimes.push(waitMin);
        }
      }

      // Consult time calculation: completed_at minus started_at (fallback called_at)
      let consultMin = null;
      const startIso = a.started_at || a.called_at;
      if (a.completed_at && startIso) {
        const outMs = new Date(a.completed_at).getTime();
        const stMs = new Date(startIso).getTime();
        if (!isNaN(outMs) && !isNaN(stMs) && outMs >= stMs) {
          consultMin = (outMs - stMs) / 60000;
          overallConsultTimes.push(consultMin);
        }
      }

      // Update doctor breakdown
      const docEntry = docStatsMap.get(a.doctor_id);
      if (docEntry) {
        docEntry.total++;
        if (isCompleted) docEntry.completed++;
        if (isMissed) docEntry.missed++;
        if (waitMin !== null) docEntry.wait_times.push(waitMin);
        if (consultMin !== null) docEntry.consult_times.push(consultMin);
      }

      // Update department breakdown
      const deptEntry = aDeptId ? deptStatsMap.get(aDeptId) : null;
      if (deptEntry) {
        deptEntry.total++;
        if (isCompleted) deptEntry.completed++;
        if (isMissed) deptEntry.missed++;
        if (waitMin !== null) deptEntry.wait_times.push(waitMin);
        if (consultMin !== null) deptEntry.consult_times.push(consultMin);
      }
    }

    // Rates calculation
    const nonCancelled = totalBookings - cancelledCount;
    const no_show_rate = nonCancelled > 0 ? Number((missedCount / nonCancelled).toFixed(3)) : null;
    const completion_rate = nonCancelled > 0 ? Number((completedCount / nonCancelled).toFixed(3)) : null;

    // Overall Averages: return null, not 0, when no data
    const avg_wait_min = overallWaitTimes.length > 0
      ? Number((overallWaitTimes.reduce((acc, v) => acc + v, 0) / overallWaitTimes.length).toFixed(1))
      : null;

    const avg_consult_min = overallConsultTimes.length > 0
      ? Number((overallConsultTimes.reduce((acc, v) => acc + v, 0) / overallConsultTimes.length).toFixed(1))
      : null;

    // By doctor array
    const by_doctor = Array.from(docStatsMap.values())
      .filter(d => filterDoctorId === null || d.id === filterDoctorId)
      .map(d => ({
        id: d.id,
        name: d.name,
        department_name: d.department_name,
        total: d.total,
        completed: d.completed,
        missed: d.missed,
        avg_wait_min: d.wait_times.length > 0
          ? Number((d.wait_times.reduce((acc, v) => acc + v, 0) / d.wait_times.length).toFixed(1))
          : null,
        avg_consult_min: d.consult_times.length > 0
          ? Number((d.consult_times.reduce((acc, v) => acc + v, 0) / d.consult_times.length).toFixed(1))
          : null
      }));

    // By department array
    const by_department = Array.from(deptStatsMap.values())
      .filter(dp => filterDeptId === null || dp.id === filterDeptId)
      .map(dp => ({
        id: dp.id,
        name: dp.name,
        total: dp.total,
        completed: dp.completed,
        missed: dp.missed,
        avg_wait_min: dp.wait_times.length > 0
          ? Number((dp.wait_times.reduce((acc, v) => acc + v, 0) / dp.wait_times.length).toFixed(1))
          : null,
        avg_consult_min: dp.consult_times.length > 0
          ? Number((dp.consult_times.reduce((acc, v) => acc + v, 0) / dp.consult_times.length).toFixed(1))
          : null
      }));

    // Reminders stats in the period (if messages table exists)
    let remindersPayload = undefined;
    if (Array.isArray(messages)) {
      const periodReminders = messages.filter(m => {
        if ((m.type || '') !== 'reminder') return false;
        if (!m.sent_at) return false;
        const msgDate = m.sent_at.split('T')[0];
        return msgDate >= from && msgDate <= to;
      });
      remindersPayload = {
        sent: periodReminders.filter(m => m.status === 'sent' || m.status === 'delivered').length,
        sms_fallback: periodReminders.filter(m => m.channel === 'sms' || m.channel === 'sms-sim').length
      };
    }

    const responsePayload = {
      success: true,
      range: { from, to, days: daysCount + 1 },
      summary: {
        total_bookings: totalBookings,
        completed: completedCount,
        cancelled: cancelledCount,
        missed: missedCount,
        auto_shifted: autoShiftedCount,
        walk_ins: walkInsCount,
        no_show_rate,
        completion_rate,
        avg_wait_min,
        avg_consult_min
      },
      daily: Array.from(dailyMap.values()),
      peak_hours: peakHours,
      by_department,
      by_doctor,
      sources
    };

    if (remindersPayload) {
      responsePayload.reminders = remindersPayload;
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Error computing analytics:', err);
    res.status(500).json({ success: false, message: 'Internal server error while computing analytics: ' + err.message });
  }
});

// GET /api/admin/reports/daily (Report generation data)
router.get('/reports/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];

  const appts = (db.store.data.appointments || []).filter(a => a.date === date && a.status !== 'pending_payment');
  const queue = db.store.data.queue || [];

  const doctorBreakdown = (db.store.data.doctors || []).map(doc => {
    const docAppts = appts.filter(a => a.doctor_id === doc.id);
    const completed = docAppts.filter(a => a.status === 'completed').length;
    const missed = docAppts.filter(a => a.status === 'missed').length;
    const cancelled = docAppts.filter(a => a.status === 'cancelled').length;
    const waiting = docAppts.filter(a => a.status === 'booked' || a.status === 'waiting' || a.status === 'rescheduled').length;

    return {
      doctor_id: doc.id,
      doctor_name: doc.name,
      specialty: doc.specialty,
      room_no: doc.room_no,
      total_appointments: docAppts.length,
      completed,
      missed,
      cancelled,
      waiting,
      revenue_estimated: completed * doc.consultation_fee
    };
  });

  const totalCompleted = doctorBreakdown.reduce((sum, d) => sum + d.completed, 0);
  const totalRevenue = doctorBreakdown.reduce((sum, d) => sum + d.revenue_estimated, 0);

  res.json({
    success: true,
    report: {
      generated_at: new Date().toISOString(),
      report_date: date,
      hospital_name: db.store.data.settings.hospital_name,
      summary: {
        total_booked: appts.length,
        total_completed: totalCompleted,
        total_revenue: totalRevenue,
        avg_wait_minutes: 18
      },
      doctor_breakdown: doctorBreakdown,
      appointments: appts.map(a => {
        const doc = db.store.data.doctors.find(d => d.id === a.doctor_id);
        return {
          token_no: a.token_no,
          patient_name: a.patient_name,
          doctor_name: doc ? doc.name : 'Unknown',
          time: a.time,
          status: a.status,
          disease: a.disease
        };
      })
    }
  });
});

// GET /api/admin/messages (WhatsApp message delivery logs)
router.get('/messages', (req, res) => {
  const messages = db.store.data.messages || [];
  res.json({ success: true, messages: [...messages].reverse() });
});

// GET /api/admin/appointments (List all appointments for admin table)
router.get('/appointments', (req, res) => {
  const appts = db.store.data.appointments || [];
  const doctors = db.store.data.doctors || [];
  const departments = db.store.data.departments || [];
  const users = db.store.data.users || [];

  const decorated = appts.map(a => {
    const doc = doctors.find(d => d.id === a.doctor_id);
    const dept = doc ? departments.find(d => d.id === doc.department_id) : null;
    const usr = users.find(u => u.id === a.user_id);
    const phone = a.whatsapp_no || (usr ? usr.phone : null);
    const lang = a.language || (usr ? usr.language : 'en') || 'en';

    return {
      ...a,
      doctor_name: doc ? doc.name : (a.doctor_name || 'Unknown'),
      department_name: dept ? dept.name : (a.department_name || 'General'),
      room_no: doc ? (doc.room || doc.room_no || '-') : (a.room_no || '-'),
      patient_phone: phone,
      language: lang
    };
  });

  res.json({ success: true, appointments: [...decorated].reverse() });
});

// POST /api/admin/appointments/:id/remind (Send reminder now - admin and receptionist only)
router.post('/appointments/:id/remind', authenticateToken, authorizeRole('admin', 'receptionist'), async (req, res) => {
  try {
    const apptId = Number(req.params.id);
    const appt = db.store.data.appointments.find(a => a.id === apptId);

    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const io = req.app.get('io');
    const result = await sendAppointmentReminder(appt, io, { force: true });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason === 'max_attempts_exceeded' 
          ? 'Maximum reminder attempts (3) already reached' 
          : 'Failed to deliver reminder notification'
      });
    }

    return res.json({
      success: true,
      message: `Reminder sent successfully via ${result.channel}`,
      channel: result.channel,
      attempts: result.attempts,
      sent_at: result.sent_at
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
