import express from 'express';
import db from '../database/db.js';

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

// PATCH /api/admin/settings (Update slot duration & grace period)
router.patch('/settings', (req, res) => {
  const { slot_duration_min, grace_period_min, hospital_name, hospital_phone, hospital_email } = req.body;

  if (slot_duration_min) {
    db.store.data.settings.slot_duration_min = String(slot_duration_min);
  }
  if (grace_period_min) {
    db.store.data.settings.grace_period_min = String(grace_period_min);
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

// GET /api/admin/reports/daily (Report generation data)
router.get('/reports/daily', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];

  const appts = (db.store.data.appointments || []).filter(a => a.date === date);
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

export default router;
