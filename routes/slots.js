import express from 'express';
import db from '../database/db.js';

const router = express.Router();

/**
 * Helper to auto-generate slots for a doctor on a specific date if they don't exist yet
 */
function ensureSlotsForDoctorDate(doctorId, dateStr) {
  const existing = db.store.data.slots.filter(
    s => s.doctor_id === doctorId && s.date === dateStr
  );

  if (existing.length > 0) {
    return existing;
  }

  const doctor = db.store.data.doctors.find(d => d.id === doctorId);
  if (!doctor) return [];

  const durationMin = Number(db.store.data.settings.slot_duration_min) || 15;
  const startHourStr = doctor.start_hour || '09:00';
  const endHourStr = doctor.end_hour || '14:00';

  const [sH, sM] = startHourStr.split(':').map(Number);
  const [eH, eM] = endHourStr.split(':').map(Number);

  let currentMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  const generated = [];
  let nextId = (db.store.data.slots.length || 0) + 1;

  while (currentMin + durationMin <= endMin) {
    const slotStartH = Math.floor(currentMin / 60).toString().padStart(2, '0');
    const slotStartM = (currentMin % 60).toString().padStart(2, '0');
    const slotEndMin = currentMin + durationMin;
    const slotEndH = Math.floor(slotEndMin / 60).toString().padStart(2, '0');
    const slotEndM = (slotEndMin % 60).toString().padStart(2, '0');

    const newSlot = {
      id: nextId++,
      doctor_id: doctorId,
      date: dateStr,
      start_time: `${slotStartH}:${slotStartM}`,
      end_time: `${slotEndH}:${slotEndM}`,
      status: 'available',
      created_at: new Date().toISOString()
    };

    generated.push(newSlot);
    db.store.data.slots.push(newSlot);
    currentMin += durationMin;
  }

  db.save();
  return generated;
}

// GET /api/slots?doctor_id=1&date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { doctor_id, date } = req.query;

  if (!doctor_id || !date) {
    return res.status(400).json({ success: false, message: 'doctor_id and date parameters are required' });
  }

  const docId = Number(doctor_id);
  const doctor = db.store.data.doctors.find(d => d.id === docId);
  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor not found' });
  }

  // Ensure slots exist for this date
  const slots = ensureSlotsForDoctorDate(docId, date);

  // Return slots ordered by start_time
  slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Count available, booked, missed
  const stats = {
    total: slots.length,
    available: slots.filter(s => s.status === 'available').length,
    booked: slots.filter(s => s.status === 'booked').length,
    missed: slots.filter(s => s.status === 'missed').length
  };

  res.json({
    success: true,
    doctor: {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      room_no: doctor.room_no
    },
    date,
    stats,
    slots
  });
});

export default router;
