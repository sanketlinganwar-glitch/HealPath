import express from 'express';
import db from '../database/db.js';

const router = express.Router();

// GET /api/queue (List queue items with filters and estimated wait times)
router.get('/', (req, res) => {
  const { doctor_id, status } = req.query;
  let queueList = db.store.data.queue || [];

  if (doctor_id) {
    queueList = queueList.filter(q => q.doctor_id === Number(doctor_id));
  }

  if (status) {
    queueList = queueList.filter(q => q.status === status);
  }

  const enriched = queueList.map(item => {
    const doc = db.store.data.doctors.find(d => d.id === item.doctor_id);
    const dept = doc ? db.store.data.departments.find(dp => dp.id === doc.department_id) : null;
    const appt = db.store.data.appointments.find(a => a.id === item.appointment_id);

    // Calculate estimated wait time: (number of waiting patients ahead) * (doctor's default consult min or 15)
    const waitingAhead = queueList.filter(
      q => q.doctor_id === item.doctor_id &&
           q.status === 'waiting' &&
           q.id < item.id
    ).length;

    const consultMin = dept?.default_consult_min || 15;
    const estWaitTimeMin = item.status === 'in_progress' ? 0 : waitingAhead * consultMin;

    return {
      ...item,
      doctor_name: doc ? doc.name : 'Doctor',
      room_no: doc ? doc.room_no : '101',
      department_name: dept ? dept.name : 'Department',
      slot_time: appt ? appt.time : '',
      checked_in: appt ? appt.checked_in : false,
      disease: appt ? appt.disease : '',
      age: appt ? appt.age : null,
      est_wait_minutes: estWaitTimeMin
    };
  });

  res.json({ success: true, queue: enriched });
});

// GET /api/queue/live-board (Overview for TV monitors and public display)
router.get('/live-board', (req, res) => {
  const doctors = db.store.data.doctors || [];
  const queue = db.store.data.queue || [];

  const board = doctors.map(doc => {
    const dept = db.store.data.departments.find(d => d.id === doc.department_id);
    const docQueue = queue.filter(q => q.doctor_id === doc.id);

    const currentCalling = docQueue.find(q => q.status === 'in_progress') || null;
    const nextPatients = docQueue.filter(q => q.status === 'waiting').slice(0, 5);
    const completedCount = docQueue.filter(q => q.status === 'completed').length;

    return {
      doctor_id: doc.id,
      doctor_name: doc.name,
      specialty: doc.specialty,
      room_no: doc.room_no,
      doctor_status: doc.status,
      department_name: dept ? dept.name : 'General',
      current_calling: currentCalling ? {
        token_no: currentCalling.token_no,
        patient_name: currentCalling.patient_name,
        called_at: currentCalling.called_at
      } : null,
      next_tokens: nextPatients.map(p => ({
        token_no: p.token_no,
        patient_name: p.patient_name
      })),
      total_waiting: nextPatients.length,
      total_completed: completedCount
    };
  });

  res.json({ success: true, board });
});

// POST /api/queue/call-next (Doctor calls next waiting patient)
router.post('/call-next', (req, res) => {
  const { doctor_id } = req.body;
  if (!doctor_id) {
    return res.status(400).json({ success: false, message: 'doctor_id is required' });
  }

  const docId = Number(doctor_id);

  // Mark any currently in-progress patient as completed or keep them
  const currentInProgress = db.store.data.queue.find(
    q => q.doctor_id === docId && q.status === 'in_progress'
  );
  if (currentInProgress) {
    currentInProgress.status = 'completed';
    currentInProgress.completed_at = new Date().toISOString();
    const curAppt = db.store.data.appointments.find(a => a.id === currentInProgress.appointment_id);
    if (curAppt) curAppt.status = 'completed';
  }

  // Find next waiting patient
  const nextWaiting = db.store.data.queue.find(
    q => q.doctor_id === docId && q.status === 'waiting'
  );

  if (!nextWaiting) {
    db.save();
    return res.json({
      success: true,
      message: 'No more waiting patients in queue for this doctor',
      next_patient: null
    });
  }

  nextWaiting.status = 'in_progress';
  nextWaiting.called_at = new Date().toISOString();

  const appt = db.store.data.appointments.find(a => a.id === nextWaiting.appointment_id);
  if (appt) {
    appt.status = 'in_progress';
  }

  db.save();

  // Socket broadcast
  const io = req.app.get('io');
  if (io) {
    io.emit('queue:patient_called', {
      queueId: nextWaiting.id,
      tokenNo: nextWaiting.token_no,
      patientName: nextWaiting.patient_name,
      doctorId: docId,
      calledAt: nextWaiting.called_at
    });
    io.emit('queue:updated', { doctorId: docId });
  }

  res.json({
    success: true,
    message: `Calling patient ${nextWaiting.patient_name} (${nextWaiting.token_no})`,
    patient: nextWaiting
  });
});

// POST /api/queue/status (Update status: waiting, in_progress, completed, missed)
router.post('/status', (req, res) => {
  const { queue_id, status } = req.body;

  const valid = ['waiting', 'in_progress', 'completed', 'missed'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${valid.join(', ')}` });
  }

  const item = db.store.data.queue.find(q => q.id === Number(queue_id));
  if (!item) {
    return res.status(404).json({ success: false, message: 'Queue item not found' });
  }

  item.status = status;
  if (status === 'in_progress') item.called_at = new Date().toISOString();
  if (status === 'completed') item.completed_at = new Date().toISOString();

  const appt = db.store.data.appointments.find(a => a.id === item.appointment_id);
  if (appt) {
    appt.status = status;
  }

  db.save();

  const io = req.app.get('io');
  if (io) {
    io.emit('queue:updated', { doctorId: item.doctor_id });
  }

  res.json({ success: true, message: `Queue status updated to ${status}`, item });
});

// GET /api/queue/stats
router.get('/stats', (req, res) => {
  const queue = db.store.data.queue || [];
  const appts = db.store.data.appointments || [];

  const waiting = queue.filter(q => q.status === 'waiting').length;
  const inProgress = queue.filter(q => q.status === 'in_progress').length;
  const completed = queue.filter(q => q.status === 'completed').length;
  const missed = queue.filter(q => q.status === 'missed').length;

  res.json({
    success: true,
    stats: {
      total_appointments: appts.length,
      waiting,
      in_progress: inProgress,
      completed,
      missed,
      avg_wait_minutes: 18
    }
  });
});

export default router;
