/**
 * HealPath - Timezone & Slot Calculation Utilities
 * Standardized on Asia/Kolkata (IST = UTC+5:30)
 */

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current local time components in Asia/Kolkata
 * Avoids UTC day mismatch when it is between 00:00 and 05:30 AM IST.
 * 
 * @param {Date} [dateObj=new Date()]
 * @returns {{ dateStr: string, timeStr: string, hour: number, minute: number, second: number, currentMinutes: number }}
 */
export function getKolkataTime(dateObj = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(dateObj);
  const getPart = (type) => parts.find(p => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const currentMinutes = hour * 60 + minute;

  return {
    dateStr,
    timeStr,
    hour,
    minute,
    second,
    currentMinutes
  };
}

/**
 * Converts a slot date ("YYYY-MM-DD") and slot time ("HH:mm") into Asia/Kolkata epoch timestamp in ms.
 * 
 * @param {string} dateStr e.g. "2026-10-25"
 * @param {string} timeStr e.g. "14:30"
 * @returns {number} Epoch timestamp in milliseconds
 */
export function getSlotKolkataTimestamp(dateStr, timeStr) {
  if (!dateStr || !timeStr) return NaN;
  const cleanTime = timeStr.trim();
  const timeWithSec = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
  // Parse explicitly with Asia/Kolkata offset (+05:30)
  const isoWithOffset = `${dateStr.trim()}T${timeWithSec}+05:30`;
  const parsed = new Date(isoWithOffset).getTime();
  if (isNaN(parsed)) {
    // Fallback parsing if malformed
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = cleanTime.split(':').map(Number);
    // Construct UTC timestamp minus 5.5 hours
    const utcMs = Date.UTC(y, m - 1, d, h, min, 0) - (5.5 * 60 * 60 * 1000);
    return utcMs;
  }
  return parsed;
}

/**
 * Calculates remaining minutes until slot start in Asia/Kolkata
 * Positive = slot is in the future
 * Negative = slot start time has already passed
 * 
 * @param {string} dateStr 
 * @param {string} timeStr 
 * @param {number} [nowMs=Date.now()]
 * @returns {number}
 */
export function getMinutesUntilSlot(dateStr, timeStr, nowMs = Date.now()) {
  const slotMs = getSlotKolkataTimestamp(dateStr, timeStr);
  if (isNaN(slotMs)) return -Infinity;
  return (slotMs - nowMs) / (60 * 1000);
}

/**
 * Validates whether string is a valid YYYY-MM-DD date
 * 
 * @param {string} str 
 * @returns {boolean}
 */
export function isValidDateStr(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(`${str}T12:00:00+05:30`);
  return !isNaN(dt.getTime()) && dt.getFullYear() === y && (dt.getMonth() + 1) === m && dt.getDate() === d;
}

/**
 * Shifts a YYYY-MM-DD date by delta days in Asia/Kolkata
 * 
 * @param {string} dateStr 
 * @param {number} deltaDays 
 * @returns {string} YYYY-MM-DD
 */
export function shiftKolkataDate(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  const fYear = dt.getUTCFullYear();
  const fMonth = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const fDay = String(dt.getUTCDate()).padStart(2, '0');
  return `${fYear}-${fMonth}-${fDay}`;
}

/**
 * Calculates number of days between fromStr and toStr (inclusive difference)
 * 
 * @param {string} fromStr YYYY-MM-DD
 * @param {string} toStr YYYY-MM-DD
 * @returns {number}
 */
export function getDaysDifference(fromStr, toStr) {
  const fromMs = new Date(`${fromStr}T12:00:00+05:30`).getTime();
  const toMs = new Date(`${toStr}T12:00:00+05:30`).getTime();
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

/**
 * Returns an array of consecutive YYYY-MM-DD date strings between fromStr and toStr
 * 
 * @param {string} fromStr 
 * @param {string} toStr 
 * @returns {string[]}
 */
export function getDateRangeArray(fromStr, toStr) {
  const dates = [];
  const days = getDaysDifference(fromStr, toStr);
  if (days < 0) return [];
  for (let i = 0; i <= days; i++) {
    dates.push(shiftKolkataDate(fromStr, i));
  }
  return dates;
}

export default {
  TIMEZONE,
  getKolkataTime,
  getSlotKolkataTimestamp,
  getMinutesUntilSlot,
  isValidDateStr,
  shiftKolkataDate,
  getDaysDifference,
  getDateRangeArray
};
