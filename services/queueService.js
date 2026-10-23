import db from '../database/db.js';
import whatsappService from './whatsapp.js';

class QueueService {
  /**
   * Generate next token number per doctor for a date (e.g. CARD-004)
   */
  generateTokenNumber(doctorId, dateStr) {
    const doctor = db.store.data.doctors.find(d => d.id === doctorId);
    const dept = doctor ? db.store.data.departments.find(dp => dp.id === doctor.department_id) : null;
    const prefix = dept ? dept.code : `D${doctorId}`;

    const appts = db.store.data.appointments.filter(
      a => a.doctor_id === doctorId && a.date === dateStr
    );
    const nextSeq = appts.length + 1;
    return `${prefix}-${nextSeq.toString().padStart(3, '0')}`;
  }

  /**
   * Atomic Slot Booking with race-condition prevention
   */
  async bookSlot({
    slotId,
    patientId = null,
    patientName,
    age,
    disease,
    whatsappNo,
    notes = '',
    io = null
  }) {
    const slot = db.store.data.slots.find(s => s.id === Number(slotId));
    if (!slot) {
      throw new Error('Slot does not exist');
    }

    if (slot.status !== 'available') {
      throw new Error('This time slot is already booked or no longer available. Please select another slot.');
    }

    const doctor = db.store.data.doctors.find(d => d.id === slot.doctor_id);
    if (!doctor) {
      throw new Error('Assigned doctor not found');
    }

    // Atomic assignment
    slot.status = 'booked';

    const tokenNo = this.generateTokenNumber(slot.doctor_id, slot.date);
    const appointmentId = (db.store.data.appointments.length || 0) + 1;

    const appointment = {
      id: appointmentId,
      patient_id: patientId,
      patient_name: patientName,
      age: Number(age),
      disease,
      whatsapp_no: whatsappNo,
      notes,
      slot_id: slot.id,
      token_no: tokenNo,
      doctor_id: slot.doctor_id,
      department_id: doctor.department_id,
      date: slot.date,
      time: slot.start_time,
      checked_in: false,
      status: 'booked',
      created_at: new Date().toISOString()
    };

    db.store.data.appointments.push(appointment);

    // Add to live queue table
    const queueEntry = {
      id: (db.store.data.queue.length || 0) + 1,
      appointment_id: appointment.id,
      token_no: tokenNo,
      doctor_id: slot.doctor_id,
      department_id: doctor.department_id,
      patient_name: patientName,
      status: 'waiting',
      position: this.calculateQueuePosition(slot.doctor_id, slot.date),
      called_at: null,
      completed_at: null,
      created_at: appointment.created_at
    };

    db.store.data.queue.push(queueEntry);
    db.save();

    // Send WhatsApp confirmation asynchronously
    whatsappService.sendBookingConfirmation({
      appointment,
      doctorName: doctor.name,
      io
    }).catch(console.error);

    // Broadcast queue update to connected clients
    if (io) {
      io.emit('queue:updated', { doctorId: slot.doctor_id });
      io.emit('slot:booked', { slotId: slot.id, doctorId: slot.doctor_id, date: slot.date });
    }

    return { appointment, token: tokenNo, slot };
  }

  calculateQueuePosition(doctorId, dateStr) {
    const waiting = db.store.data.queue.filter(
      q => q.doctor_id === doctorId && q.status === 'waiting'
    );
    return waiting.length + 1;
  }

  /**
   * Reschedule appointment to another available slot
   */
  async rescheduleAppointment({ appointmentId, newSlotId, io = null }) {
    const appt = db.store.data.appointments.find(a => a.id === Number(appointmentId));
    if (!appt) {
      throw new Error('Appointment not found');
    }

    const newSlot = db.store.data.slots.find(s => s.id === Number(newSlotId));
    if (!newSlot || newSlot.status !== 'available') {
      throw new Error('Selected reschedule slot is no longer available');
    }

    // Free old slot
    const oldSlot = db.store.data.slots.find(s => s.id === appt.slot_id);
    if (oldSlot) {
      oldSlot.status = 'available';
    }

    // Book new slot
    newSlot.status = 'booked';
    appt.slot_id = newSlot.id;
    appt.date = newSlot.date;
    appt.time = newSlot.start_time;
    appt.status = 'rescheduled';
    appt.token_no = this.generateTokenNumber(newSlot.doctor_id, newSlot.date);

    // Update queue entry
    const qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
    if (qItem) {
      qItem.token_no = appt.token_no;
      qItem.doctor_id = newSlot.doctor_id;
      qItem.status = 'waiting';
    }

    db.save();

    const doctor = db.store.data.doctors.find(d => d.id === newSlot.doctor_id);
    whatsappService.sendRescheduleNotice({
      appointment: appt,
      doctorName: doctor ? doctor.name : 'your doctor',
      io
    }).catch(console.error);

    if (io) {
      io.emit('queue:updated', { doctorId: newSlot.doctor_id });
      io.emit('slot:updated', { oldSlotId: oldSlot?.id, newSlotId: newSlot.id });
    }

    return appt;
  }

  /**
   * Patient or Receptionist Check-in
   */
  async checkInAppointment(appointmentId, io = null) {
    const appt = db.store.data.appointments.find(a => a.id === Number(appointmentId));
    if (!appt) {
      throw new Error('Appointment not found');
    }

    appt.checked_in = true;
    appt.status = 'checked_in';

    const qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
    if (qItem && qItem.status === 'missed') {
      qItem.status = 'waiting';
    }

    db.save();

    if (io) {
      io.emit('queue:updated', { doctorId: appt.doctor_id });
      io.emit('appointment:checked_in', { appointmentId: appt.id });
    }

    return appt;
  }

  /**
   * Check and auto-shift missed slots (called by node-cron every minute)
   */
  async processMissedSlots(io = null) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const gracePeriod = Number(db.store.data.settings.grace_period_min) || 10;

    // Find booked appointments for today where patient has not checked in and time has passed slot + grace
    const overdueAppts = db.store.data.appointments.filter(appt => {
      if (appt.date !== todayStr || appt.checked_in || appt.status === 'completed' || appt.status === 'cancelled') {
        return false;
      }

      const [slotH, slotM] = appt.time.split(':').map(Number);
      const slotStartMinutes = slotH * 60 + slotM;
      return currentMinutes > (slotStartMinutes + gracePeriod);
    });

    for (const appt of overdueAppts) {
      const oldTime = appt.time;
      const oldSlot = db.store.data.slots.find(s => s.id === appt.slot_id);
      if (oldSlot) {
        oldSlot.status = 'missed';
      }

      // Find next available slot for this doctor today
      const availableSlots = db.store.data.slots.filter(s => {
        if (s.doctor_id !== appt.doctor_id || s.date !== todayStr || s.status !== 'available') {
          return false;
        }
        const [sh, sm] = s.start_time.split(':').map(Number);
        return (sh * 60 + sm) > currentMinutes;
      });

      if (availableSlots.length > 0) {
        const nextSlot = availableSlots[0];
        nextSlot.status = 'booked';

        appt.slot_id = nextSlot.id;
        appt.time = nextSlot.start_time;
        appt.status = 'rescheduled';
        appt.token_no = this.generateTokenNumber(appt.doctor_id, todayStr);

        const qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
        if (qItem) {
          qItem.token_no = appt.token_no;
          qItem.status = 'waiting';
        }

        console.log(`[Cron] Auto-shifted missed appointment #${appt.id} (${appt.patient_name}) from ${oldTime} to ${nextSlot.start_time}`);

        const doctor = db.store.data.doctors.find(d => d.id === appt.doctor_id);
        whatsappService.sendMissedShiftNotice({
          appointment: appt,
          oldTime,
          newTime: nextSlot.start_time,
          doctorName: doctor ? doctor.name : 'your doctor',
          io
        }).catch(console.error);
      } else {
        appt.status = 'missed';
        const qItem = db.store.data.queue.find(q => q.appointment_id === appt.id);
        if (qItem) {
          qItem.status = 'missed';
        }
        console.log(`[Cron] Appointment #${appt.id} marked as missed (no later slots available today).`);
      }
    }

    if (overdueAppts.length > 0) {
      db.save();
      if (io) {
        io.emit('queue:updated', {});
      }
    }
  }
}

export const queueService = new QueueService();
export default queueService;
