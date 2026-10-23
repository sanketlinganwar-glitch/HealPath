import express from 'express';
import db from '../database/db.js';
import queueService from '../services/queueService.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// POST /api/appointments/book (Public or authenticated booking)
router.post('/book', async (req, res) => {
  try {
    const { slot_id, patient_name, age, disease, whatsapp_no, notes, patient_id } = req.body;

    // Validation
    if (!slot_id || !patient_name || !age || !disease || !whatsapp_no) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID, Patient Name, Age, Disease/Symptoms, and WhatsApp number are required'
      });
    }

    // Phone format check: Must be at least 10 digits
    const cleanedPhone = whatsapp_no.trim();
    if (!cleanedPhone.match(/^\+?[1-9]\d{9,14}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid WhatsApp number. Please include valid country code (e.g., +91 9876543210).'
      });
    }

    const io = req.app.get('io');
    const result = await queueService.bookSlot({
      slotId: slot_id,
      patientId: patient_id || (req.user ? req.user.id : null),
      patientName: patient_name.trim(),
      age: Number(age),
      disease: disease.trim(),
      whatsappNo: cleanedPhone,
      notes: notes || '',
      io
    });

    const doctor = db.store.data.doctors.find(d => d.id === result.appointment.doctor_id);
    const department = doctor ? db.store.data.departments.find(dp => dp.id === doctor.department_id) : null;

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      token: result.token,
      appointment: {
        ...result.appointment,
        doctor_name: doctor ? doctor.name : 'Doctor',
        department_name: department ? department.name : 'Department',
        room_no: doctor ? doctor.room_no : '101'
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/appointments/:id/reschedule
router.post('/:id/reschedule', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const { new_slot_id } = req.body;

    if (!new_slot_id) {
      return res.status(400).json({ success: false, message: 'New slot ID is required' });
    }

    const io = req.app.get('io');
    const updated = await queueService.rescheduleAppointment({
      appointmentId,
      newSlotId: new_slot_id,
      io
    });

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully!',
      appointment: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/appointments/:id/check-in
router.post('/:id/check-in', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const io = req.app.get('io');
    const updated = await queueService.checkInAppointment(appointmentId, io);

    res.json({
      success: true,
      message: 'Patient successfully checked in! Timer stopped.',
      appointment: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/appointments/my (List appointments for authenticated user or by phone query)
router.get('/my', (req, res) => {
  const { phone, email } = req.query;
  let appts = db.store.data.appointments || [];

  if (phone) {
    const cleanP = phone.replace(/\D/g, '');
    appts = appts.filter(a => a.whatsapp_no.replace(/\D/g, '').endsWith(cleanP));
  }

  // Enrich with doctor and department names
  const enriched = appts.map(a => {
    const doc = db.store.data.doctors.find(d => d.id === a.doctor_id);
    const dept = doc ? db.store.data.departments.find(dp => dp.id === doc.department_id) : null;
    const qItem = db.store.data.queue.find(q => q.appointment_id === a.id);

    return {
      ...a,
      doctor_name: doc ? doc.name : 'Unknown Doctor',
      doctor_specialty: doc ? doc.specialty : '',
      room_no: doc ? doc.room_no : '',
      department_name: dept ? dept.name : '',
      queue_status: qItem ? qItem.status : 'unknown',
      queue_position: qItem ? qItem.position : '-'
    };
  });

  // Sort latest first
  enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ success: true, appointments: enriched });
});

// GET /api/appointments/:id
router.get('/:id', (req, res) => {
  const appt = db.store.data.appointments.find(a => a.id === Number(req.params.id));
  if (!appt) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  const doc = db.store.data.doctors.find(d => d.id === appt.doctor_id);
  const dept = doc ? db.store.data.departments.find(dp => dp.id === doc.department_id) : null;
  const qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);

  res.json({
    success: true,
    appointment: {
      ...appt,
      doctor_name: doc ? doc.name : 'Unknown Doctor',
      room_no: doc ? doc.room_no : '',
      department_name: dept ? dept.name : '',
      queue_status: qItem ? qItem.status : 'unknown'
    }
  });
});

// POST /api/appointments/:id/cancel
router.post('/:id/cancel', (req, res) => {
  const appt = db.store.data.appointments.find(a => a.id === Number(req.params.id));
  if (!appt) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  appt.status = 'cancelled';

  // Free slot
  const slot = db.store.data.slots.find(s => s.id === appt.slot_id);
  if (slot) {
    slot.status = 'available';
  }

  // Remove from active queue
  const qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
  if (qItem) {
    qItem.status = 'cancelled';
  }

  db.save();

  const io = req.app.get('io');
  if (io) {
    io.emit('queue:updated', { doctorId: appt.doctor_id });
    io.emit('slot:updated', { slotId: slot?.id });
  }

  res.json({ success: true, message: 'Appointment cancelled and slot freed' });
});

export default router;
