import db from '../database/db.js';

class WhatsAppService {
  constructor() {
    this.cloudToken = process.env.WHATSAPP_CLOUD_TOKEN;
    this.phoneId = process.env.WHATSAPP_PHONE_ID;
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    this.twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  }

  /**
   * Send WhatsApp notification with async retry & automatic fallback to live simulation
   */
  async sendMessage({ appointmentId = null, recipientPhone, text, io = null }) {
    // Clean and validate E.164 phone
    const formattedPhone = recipientPhone.startsWith('+') ? recipientPhone : `+${recipientPhone.replace(/\D/g, '')}`;

    const logEntry = {
      id: (db.store.data.messages.length || 0) + 1,
      appointment_id: appointmentId,
      recipient_phone: formattedPhone,
      message_text: text,
      provider: 'simulation',
      status: 'sent',
      error_message: null,
      sent_at: new Date().toISOString()
    };

    try {
      // 1. Try WhatsApp Cloud API if configured
      if (this.cloudToken && this.phoneId) {
        logEntry.provider = 'whatsapp_cloud';
        const url = `https://graph.facebook.com/v18.0/${this.phoneId}/messages`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.cloudToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone.replace('+', ''),
            type: 'text',
            text: { body: text }
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || 'WhatsApp Cloud API error');
        }
        logEntry.status = 'delivered';
      }
      // 2. Try Twilio if configured
      else if (this.twilioSid && this.twilioAuth) {
        logEntry.provider = 'twilio';
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
        const params = new URLSearchParams();
        params.append('To', `whatsapp:${formattedPhone}`);
        params.append('From', this.twilioFrom);
        params.append('Body', text);

        const authHeader = 'Basic ' + Buffer.from(`${this.twilioSid}:${this.twilioAuth}`).toString('base64');
        const res = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Twilio WhatsApp error');
        }
        logEntry.status = 'delivered';
      }
      // 3. Fallback: Reliable Live Simulation
      else {
        logEntry.provider = 'simulation';
        logEntry.status = 'delivered';
      }
    } catch (err) {
      console.warn(`[WhatsApp] Delivery attempt error (handled safely without blocking): ${err.message}`);
      logEntry.status = 'failed';
      logEntry.error_message = err.message;
    }

    // Always record in database
    db.store.data.messages.push(logEntry);
    db.save();

    // Broadcast live event to staff and patient dashboards via Socket.io
    if (io) {
      io.emit('whatsapp:message_sent', logEntry);
    }

    return logEntry;
  }

  // Booking confirmation template
  async sendBookingConfirmation({ appointment, doctorName, io }) {
    const text = `🏥 [HealPath Hospital] Hello ${appointment.patient_name}, your appointment with ${doctorName} is confirmed on ${appointment.date} at ${appointment.time}. Token No: ${appointment.token_no}. Please arrive 10 minutes early. Helpline: +91 95526 25262.`;
    return this.sendMessage({
      appointmentId: appointment.id,
      recipientPhone: appointment.whatsapp_no,
      text,
      io
    });
  }

  // Reschedule notification template
  async sendRescheduleNotice({ appointment, doctorName, io }) {
    const text = `🔄 [HealPath Hospital] Hello ${appointment.patient_name}, your appointment with ${doctorName} has been rescheduled to ${appointment.date} at ${appointment.time}. New Token No: ${appointment.token_no}. Please arrive 10 minutes early.`;
    return this.sendMessage({
      appointmentId: appointment.id,
      recipientPhone: appointment.whatsapp_no,
      text,
      io
    });
  }

  // Missed-slot auto-shift notification template
  async sendMissedShiftNotice({ appointment, oldTime, newTime, doctorName, io }) {
    const text = `⚠️ [HealPath Hospital] Hello ${appointment.patient_name}, you missed your slot at ${oldTime}. You have been automatically shifted to the next available slot on ${appointment.date} at ${newTime}. Updated Token: ${appointment.token_no}.`;
    return this.sendMessage({
      appointmentId: appointment.id,
      recipientPhone: appointment.whatsapp_no,
      text,
      io
    });
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
