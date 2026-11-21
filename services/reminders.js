/**
 * HealPath - Automatic Appointment Reminders Service
 * Runs every minute to notify patients of upcoming appointments in Asia/Kolkata local time.
 */

import db from '../database/db.js';
import whatsappService from './whatsapp.js';
import smsService from './sms.js';
import { getMinutesUntilSlot } from '../utils/time.js';
import { generateCheckinQR } from '../routes/checkin.js';

/**
 * Build localized reminder message text under 400 characters
 * 
 * @param {Object} params
 * @param {string} params.language 'en' | 'hi' | 'mr'
 * @param {string} params.doctorName
 * @param {string} params.room
 * @param {string} params.slotTime e.g. "10:00"
 * @param {string} params.tokenNo e.g. "CARD-001"
 * @param {string} params.qrLink
 * @param {string} params.queueLink
 * @returns {string} Message text under 400 chars
 */
export function buildReminderMessage({
  language = 'en',
  doctorName = 'Doctor',
  room = 'OPD Room',
  slotTime,
  tokenNo,
  qrLink,
  queueLink
}) {
  const lang = (language || 'en').toLowerCase();

  let text;
  if (lang === 'hi') {
    text = `🏥 [संजीवन हॉस्पिटल] स्मरण: ${doctorName} (${room}) के साथ आपका अपॉइंटमेंट आज ${slotTime} बजे है। टोकन: ${tokenNo}। क्यूआर चेक-इन: ${qrLink} लाइव कतार: ${queueLink} कृपया 10 मिनट पहले पहुंचें।`;
  } else if (lang === 'mr') {
    text = `🏥 [संजीवन हॉस्पिटल] स्मरण: ${doctorName} (${room}) सोबत आपली भेट आज ${slotTime} वाजता आहे. टोकन: ${tokenNo}. क्यूआर चेक-इन: ${qrLink} थेट रांग: ${queueLink} कृपया 10 मिनिटे आधी यावे.`;
  } else {
    // English fallback
    text = `🏥 [Sanjeevan Hospital] Reminder: Your appointment with ${doctorName} (${room}) is today at ${slotTime}. Token: ${tokenNo}. QR Check-in: ${qrLink} Live Queue: ${queueLink} Please arrive 10m early.`;
  }

  // Ensure under 400 characters strictly
  if (text.length > 400) {
    text = text.slice(0, 397) + '...';
  }

  return text;
}

/**
 * Determine patient's phone number
 */
export function getPatientPhone(appt) {
  if (appt.whatsapp_no && appt.whatsapp_no.trim()) {
    return appt.whatsapp_no.trim();
  }
  if (appt.patient_id) {
    const user = db.store.data.users.find(u => u.id === appt.patient_id);
    if (user && user.phone && user.phone.trim()) {
      return user.phone.trim();
    }
  }
  return null;
}

/**
 * Determine patient's saved language preference (en, hi, mr)
 */
export function getPatientLanguage(appt) {
  if (appt.language && ['en', 'hi', 'mr'].includes(appt.language.toLowerCase())) {
    return appt.language.toLowerCase();
  }
  if (appt.patient_id) {
    const user = db.store.data.users.find(u => u.id === appt.patient_id);
    if (user && user.language && ['en', 'hi', 'mr'].includes(user.language.toLowerCase())) {
      return user.language.toLowerCase();
    }
  }
  return 'en';
}

/**
 * Send an appointment reminder for a specific appointment
 * 
 * @param {Object} appt
 * @param {Object|null} [io=null]
 * @param {Object} [options={}]
 * @param {boolean} [options.force=false] Bypass time and sent_at checks (for manual admin trigger)
 * @returns {Promise<{ success: boolean, channel: string, messageId?: number }>}
 */
export async function sendAppointmentReminder(appt, io = null, { force = false } = {}) {
  const phone = getPatientPhone(appt);
  if (!phone) {
    throw new Error('Patient does not have a valid contact phone number');
  }

  if (!force && appt.reminder_sent_at) {
    return { success: false, reason: 'already_sent' };
  }

  if (!force && (appt.reminder_attempts || 0) >= 3) {
    return { success: false, reason: 'max_attempts_exceeded' };
  }

  const doctor = db.store.data.doctors.find(d => d.id === appt.doctor_id);
  const doctorName = doctor ? doctor.name : 'your doctor';
  const room = doctor ? (doctor.room || doctor.room_no || 'Consultation Room') : 'Consultation Room';

  // Generate QR Check-in link
  let qrLink = `/api/checkin/qr/${appt.id}`;
  try {
    const qrResult = await generateCheckinQR(appt.token_no);
    if (qrResult?.checkinUrl) {
      qrLink = qrResult.checkinUrl;
    }
  } catch (err) {
    console.warn(`[Reminder] Error generating QR link for token ${appt.token_no}:`, err.message);
  }

  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  const fullQrLink = qrLink.startsWith('http') ? qrLink : `${baseUrl}${qrLink}`;
  const fullQueueLink = `${baseUrl}/queue.html`;

  const language = getPatientLanguage(appt);
  const messageText = buildReminderMessage({
    language,
    doctorName,
    room,
    slotTime: appt.time,
    tokenNo: appt.token_no,
    qrLink: fullQrLink,
    queueLink: fullQueueLink
  });

  let sent = false;
  let usedChannel = 'whatsapp';
  let messageRecord = null;

  // 1. Try WhatsApp first
  try {
    const waLog = await whatsappService.sendMessage({
      appointmentId: appt.id,
      recipientPhone: phone,
      text: messageText,
      type: 'reminder',
      channel: 'whatsapp',
      io
    });

    if (waLog && waLog.status !== 'failed') {
      sent = true;
      usedChannel = waLog.channel || 'whatsapp';
      messageRecord = waLog;
    } else {
      console.warn(`[Reminder] WhatsApp status was failed for appointment #${appt.id}. Attempting SMS fallback...`);
    }
  } catch (waErr) {
    console.warn(`[Reminder] WhatsApp send error for appt #${appt.id}: ${waErr.message}. Attempting SMS fallback...`);
  }

  // 2. Fallback to SMS if WhatsApp failed
  if (!sent) {
    try {
      const smsLog = await smsService.sendSms({
        appointmentId: appt.id,
        recipientPhone: phone,
        text: messageText,
        type: 'reminder',
        io
      });

      if (smsLog && smsLog.status !== 'failed') {
        sent = true;
        usedChannel = smsLog.channel || 'sms-sim';
        messageRecord = smsLog;
      }
    } catch (smsErr) {
      console.error(`[Reminder] SMS fallback error for appt #${appt.id}: ${smsErr.message}`);
    }
  }

  // Idempotency and attempt tracking
  appt.reminder_attempts = (appt.reminder_attempts || 0) + 1;
  if (sent) {
    appt.reminder_sent_at = new Date().toISOString();
  }
  db.save();

  if (io) {
    io.emit('appointment:reminder_sent', {
      appointmentId: appt.id,
      sent,
      channel: usedChannel,
      attempts: appt.reminder_attempts,
      sent_at: appt.reminder_sent_at
    });
  }

  return {
    success: sent,
    channel: usedChannel,
    attempts: appt.reminder_attempts,
    sent_at: appt.reminder_sent_at,
    messageId: messageRecord?.id
  };
}

/**
 * Process all scheduled appointment reminders
 * Called by node-cron every 60 seconds.
 * 
 * @param {Object|null} [io=null]
 * @returns {Promise<{ checkedCount: number, sentCount: number }>}
 */
export async function processAppointmentReminders(io = null) {
  // Configured reminder window (support DEMO_REMINDER_MINUTES override)
  const demoMinutes = process.env.DEMO_REMINDER_MINUTES ? Number(process.env.DEMO_REMINDER_MINUTES) : null;
  const configuredMinutes = Number(db.store.data.settings?.reminder_minutes_before) || 60;
  const reminderMinutesBefore = (demoMinutes !== null && !isNaN(demoMinutes) && demoMinutes > 0)
    ? demoMinutes
    : configuredMinutes;

  const appointments = db.store.data.appointments || [];

  // Filter candidate appointments:
  // - status 'booked' or 'confirmed'
  // - not checked in
  // - reminder_sent_at is null
  // - attempts < 3
  const candidates = appointments.filter(appt => {
    const isBooked = appt.status === 'booked' || appt.status === 'confirmed';
    if (!isBooked) return false;
    if (appt.checked_in) return false;
    if (appt.reminder_sent_at) return false;
    if ((appt.reminder_attempts || 0) >= 3) return false;

    const phone = getPatientPhone(appt);
    if (!phone) return false; // Skip patients with no phone number

    // Calculate time until slot in Asia/Kolkata
    const diffMinutes = getMinutesUntilSlot(appt.date, appt.time);

    // Starts within next reminderMinutesBefore minutes, but has not started yet
    return diffMinutes > 0 && diffMinutes <= reminderMinutesBefore;
  });

  let sentCount = 0;
  for (const appt of candidates) {
    try {
      const res = await sendAppointmentReminder(appt, io, { force: false });
      if (res.success) {
        sentCount++;
        console.log(`⏰ [Reminder] Sent ${res.channel} reminder for Token ${appt.token_no} (Appt #${appt.id}) scheduled at ${appt.time}`);
      }
    } catch (err) {
      console.error(`[Reminder] Failed sending reminder for appointment #${appt.id}:`, err.message);
    }
  }

  return { checkedCount: candidates.length, sentCount };
}

export default {
  buildReminderMessage,
  getPatientPhone,
  getPatientLanguage,
  sendAppointmentReminder,
  processAppointmentReminders
};
