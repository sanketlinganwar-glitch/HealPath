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
      department_name: dept ? dept.name : 'General',
      department_code: dept ? dept.code : 'GEN'
    };
  });

  res.json({ success: true, doctors: enriched });
});

// GET /api/doctors/:id
router.get('/:id', (req, res) => {
  const doc = db.store.data.doctors.find(d => d.id === Number(req.params.id));
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  const dept = db.store.data.departments.find(d => d.id === doc.department_id);
  res.json({
    success: true,
    doctor: {
      ...doc,
      department_name: dept ? dept.name : 'General',
      department_code: dept ? dept.code : 'GEN'
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

export default router;
