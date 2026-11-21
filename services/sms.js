/**
 * HealPath - Fast2SMS & SMS Fallback Adapter
 * Operates in live simulation mode when FAST2SMS_API_KEY is unset
 */

import db from '../database/db.js';

class SMSService {
  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || '';
  }

  /**
   * Send an SMS notification with Fast2SMS or simulation fallback
   * 
   * @param {Object} options
   * @param {number|null} [options.appointmentId]
   * @param {string} options.recipientPhone
   * @param {string} options.text
   * @param {string} [options.type='reminder']
   * @param {Object|null} [options.io]
   * @returns {Promise<Object>}
   */
  async sendSms({ appointmentId = null, recipientPhone, text, type = 'reminder', io = null }) {
    if (!recipientPhone) {
      throw new Error('Recipient phone number is required for SMS');
    }

    const phoneStr = String(recipientPhone);
    const cleanDigits = phoneStr.replace(/\D/g, '');
    const tenDigitPhone = cleanDigits.slice(-10);
    const formattedPhone = phoneStr.startsWith('+') ? phoneStr : `+91${tenDigitPhone}`;

    const logEntry = {
      id: (db.store.data.messages.length || 0) + 1,
      appointment_id: appointmentId,
      recipient_phone: formattedPhone,
      message_text: text,
      provider: 'fast2sms-sim',
      channel: 'sms-sim',
      type: type,
      status: 'delivered',
      error_message: null,
      sent_at: new Date().toISOString()
    };

    try {
      if (this.apiKey) {
        logEntry.provider = 'fast2sms';
        logEntry.channel = 'sms';

        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': this.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'q',
            message: text,
            language: 'english',
            flash: 0,
            numbers: tenDigitPhone
          })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || (data && data.return === false)) {
          throw new Error(data?.message || `Fast2SMS HTTP error status ${res.status}`);
        }
        logEntry.status = 'delivered';
      } else {
        // Simulation mode
        logEntry.provider = 'fast2sms-sim';
        logEntry.channel = 'sms-sim';
        logEntry.status = 'delivered';
      }
    } catch (err) {
      console.warn(`[SMS] Fast2SMS dispatch failed (falling back to simulation record): ${err.message}`);
      logEntry.status = 'failed';
      logEntry.error_message = err.message;
    }

    // Record in unified messages log
    db.store.data.messages.push(logEntry);
    db.save();

    if (io) {
      io.emit('sms:message_sent', logEntry);
      io.emit('message:sent', logEntry);
    }

    return logEntry;
  }
}

export const smsService = new SMSService();
export const sendSms = (phoneOrOpts, text, extra = {}) => {
  if (typeof phoneOrOpts === 'object' && phoneOrOpts !== null) {
    return smsService.sendSms(phoneOrOpts);
  }
  return smsService.sendSms({ recipientPhone: phoneOrOpts, text, ...extra });
};
export default smsService;
