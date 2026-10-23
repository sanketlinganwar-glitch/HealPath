import db from '../database/db.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Immediately send current server time & queue summary
    socket.emit('connected', {
      message: 'Connected to MediCare Realtime Server',
      timestamp: new Date().toISOString()
    });

    // Join doctor queue room (e.g. 'doctor_1')
    socket.on('join:doctor', (doctorId) => {
      const room = `doctor_${doctorId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
    });

    // Join token tracking room (e.g. 'token_CARD-001')
    socket.on('join:token', (tokenNo) => {
      const room = `token_${tokenNo}`;
      socket.join(room);
      console.log(`Socket ${socket.id} tracking token ${tokenNo}`);
    });

    // Doctor calls next patient
    socket.on('doctor:call_next', async ({ doctorId, queueId, tokenNo }) => {
      try {
        const item = db.store.data.queue.find(q => q.id === Number(queueId) || q.token_no === tokenNo);
        if (item) {
          item.status = 'in_progress';
          item.called_at = new Date().toISOString();

          // Update appointment status as well
          const appt = db.store.data.appointments.find(a => a.id === item.appointment_id);
          if (appt) {
            appt.status = 'in_progress';
          }
          db.save();

          // Broadcast announcement to entire hospital and specific doctor room
          io.emit('queue:patient_called', {
            queueId: item.id,
            tokenNo: item.token_no,
            patientName: item.patient_name,
            doctorId: item.doctor_id,
            calledAt: item.called_at
          });

          io.emit('queue:updated', { doctorId: item.doctor_id });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Doctor completes consultation
    socket.on('doctor:complete', async ({ queueId, tokenNo }) => {
      try {
        const item = db.store.data.queue.find(q => q.id === Number(queueId) || q.token_no === tokenNo);
        if (item) {
          item.status = 'completed';
          item.completed_at = new Date().toISOString();

          const appt = db.store.data.appointments.find(a => a.id === item.appointment_id);
          if (appt) {
            appt.status = 'completed';
          }
          db.save();

          io.emit('queue:patient_completed', {
            queueId: item.id,
            tokenNo: item.token_no,
            doctorId: item.doctor_id
          });

          io.emit('queue:updated', { doctorId: item.doctor_id });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Staff or patient checks in
    socket.on('patient:check_in', async ({ appointmentId }) => {
      try {
        const appt = db.store.data.appointments.find(a => a.id === Number(appointmentId));
        if (appt) {
          appt.checked_in = true;
          appt.status = 'checked_in';
          db.save();

          io.emit('appointment:checked_in', { appointmentId: appt.id, tokenNo: appt.token_no });
          io.emit('queue:updated', { doctorId: appt.doctor_id });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.io] Client disconnected: ${socket.id}`);
    });
  });
}

export default { setupSocketHandlers };
