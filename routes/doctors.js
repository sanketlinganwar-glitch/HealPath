import express from 'express';
import db from '../database/db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// GET /api/doctors (filterable by department_id)
router.get('/', (req, res) => {
  const { department_id } = req.query;
  let doctors = db.store.data.doctors || [];

  if (department_id) {
    doctors = doctors.filter(d => d.department_id === Number(department_id));
  }

  const enriched = doctors.map(doc => {
    const dept = db.store.data.departments.find(d => d.id === doc.department_id);
    return {
      ...doc,
      avatar: doc.photo_url || doc.avatar || doc.image_url,
      photo_url: doc.photo_url || doc.avatar || doc.image_url,
      specialty: doc.specialty || doc.specialization,
      specialization: doc.specialization || doc.specialty,
      room_no: doc.room_no || doc.room,
      room: doc.room || doc.room_no,
      start_hour: doc.start_hour || doc.working_start || (doc.opd_hours ? doc.opd_hours.split('-')[0] : '09:00'),
      end_hour: doc.end_hour || doc.working_end || (doc.opd_hours ? doc.opd_hours.split('-')[1] : '14:00'),
      department_name: dept ? dept.name : (doc.department_name || 'General'),
      department_code: dept ? dept.code : 'GEN'
    };
  });

  res.json({ success: true, doctors: enriched });
});

// GET /api/doctors/:id
router.get('/:id', (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.store.data.doctors.find(d => d.id === docId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  const dept = db.store.data.departments.find(d => d.id === doc.department_id);

  // Compute next available slot
  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const availableSlots = (db.store.data.slots || [])
    .filter(s => s.doctor_id === docId && s.status === 'available')
    .filter(s => {
      if (s.date > todayDateStr) return true;
      if (s.date === todayDateStr && s.start_time >= currentTimeStr) return true;
      return false;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start_time.localeCompare(b.start_time);
    });

  const nextSlot = availableSlots[0] || null;
  const next_available_slot = nextSlot ? {
    slot_id: nextSlot.id,
    date: nextSlot.date,
    start_time: nextSlot.start_time
  } : null;

  // Compute today waiting count (queue items for this doctor with status 'waiting')
  const today_waiting_count = (db.store.data.queue || []).filter(q => {
    return q.doctor_id === docId && q.status === 'waiting';
  }).length;

  res.json({
    success: true,
    doctor: {
      ...doc,
      avatar: doc.photo_url || doc.avatar || doc.image_url,
      photo_url: doc.photo_url || doc.avatar || doc.image_url,
      specialty: doc.specialty || doc.specialization,
      specialization: doc.specialization || doc.specialty,
      room_no: doc.room_no || doc.room,
      room: doc.room || doc.room_no,
      start_hour: doc.start_hour || doc.working_start || (doc.opd_hours ? doc.opd_hours.split('-')[0] : '09:00'),
      end_hour: doc.end_hour || doc.working_end || (doc.opd_hours ? doc.opd_hours.split('-')[1] : '14:00'),
      department_name: dept ? dept.name : (doc.department_name || 'General'),
      department_code: dept ? dept.code : 'GEN',
      next_available_slot,
      today_waiting_count
    }
  });
});

// PATCH /api/doctors/:id/status (toggle available / in_consultation / on_break / off_duty)
router.patch('/:id/status', authenticateToken, (req, res) => {
  const docId = Number(req.params.id);
  const { status } = req.body;

  const validStatuses = ['available', 'in_consultation', 'on_break', 'off_duty'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const doc = db.store.data.doctors.find(d => d.id === docId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  // Check permission: doctor can update their own status, admin/receptionist can update any
  if (req.user.role === 'doctor' && req.user.doctor_id !== docId) {
    return res.status(403).json({ success: false, message: 'Unauthorized to update another doctor status' });
  }

  doc.status = status;
  db.save();

  // Notify via Socket.io if available
  if (req.app.get('io')) {
    req.app.get('io').emit('doctor:status_changed', { doctorId: docId, status });
  }

  res.json({ success: true, message: `Doctor status updated to ${status}`, doctor: doc });
});

// PATCH /api/doctors/:id/schedule (update hours or set leave days)
router.patch('/:id/schedule', authenticateToken, (req, res) => {
  const docId = Number(req.params.id);
  const { start_hour, end_hour, leave_days } = req.body;

  const doc = db.store.data.doctors.find(d => d.id === docId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  if (start_hour) doc.start_hour = start_hour;
  if (end_hour) doc.end_hour = end_hour;
  if (Array.isArray(leave_days)) doc.leave_days = leave_days;

  db.save();
  res.json({ success: true, message: 'Schedule updated successfully', doctor: doc });
});

// PATCH /api/doctors/:id/profile (Doctor self-edit bio, languages, opd_days, opd_hours)
router.patch('/:id/profile', authenticateToken, (req, res) => {
  const docId = Number(req.params.id);
  const doc = db.store.data.doctors.find(d => d.id === docId);
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  // Authorization check: doctor can only edit their own profile (doctor_id in JWT must match)
  if (req.user.role === 'doctor') {
    if (Number(req.user.doctor_id) !== docId) {
      return res.status(403).json({ success: false, message: 'Unauthorized: doctor_id in token does not match doctor profile' });
    }
    // Doctors cannot change consultation_fee or name
    if (req.body.consultation_fee !== undefined || req.body.fee !== undefined || req.body.name !== undefined) {
      return res.status(403).json({
        success: false,
        message: 'Doctors cannot modify consultation fee or official name. Please contact hospital administration.'
      });
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
  }

  const { bio, languages, opd_days, opd_hours } = req.body;

  if (languages !== undefined) {
    if (!Array.isArray(languages) || languages.some(l => typeof l !== 'string')) {
      return res.status(400).json({ success: false, message: 'Languages must be an array of strings' });
    }
    doc.languages = languages;
  }

  if (bio !== undefined) {
    doc.bio = typeof bio === 'string' ? bio.trim() : null;
  }

  if (opd_days !== undefined) {
    doc.opd_days = typeof opd_days === 'string' ? opd_days.trim() : null;
  }

  if (opd_hours !== undefined) {
    doc.opd_hours = typeof opd_hours === 'string' ? opd_hours.trim() : null;
  }

  db.save();

  // Socket notification
  if (req.app.get('io')) {
    req.app.get('io').emit('doctor:profile_updated', { doctorId: docId });
  }

  res.json({
    success: true,
    message: 'Doctor profile updated successfully',
    doctor: doc
  });
});

export default router;
