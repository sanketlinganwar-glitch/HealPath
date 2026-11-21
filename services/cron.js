import cron from 'node-cron';
import queueService from './queueService.js';
import { processAppointmentReminders } from './reminders.js';
import db from '../database/db.js';
import fileStore from './fileStore.js';

let cronTask = null;
let nightlyPurgeTask = null;

/**
 * Initialize background scheduled tasks
 * - Runs every minute to auto-shift missed appointments past the grace period
 * - Runs every minute to dispatch automatic upcoming appointment reminders
 * - Runs nightly at 02:00 AM to purge soft-deleted medical report files older than 7 days
 */
export function initCronJobs(io) {
  if (cronTask) {
    cronTask.stop();
  }
  if (nightlyPurgeTask) {
    nightlyPurgeTask.stop();
  }

  // Schedule task every minute: '* * * * *'
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await queueService.processMissedSlots(io);
    } catch (err) {
      console.error('[Cron] Error processing missed slots:', err.message);
    }

    try {
      await processAppointmentReminders(io);
    } catch (err) {
      console.error('[Cron] Error processing appointment reminders:', err.message);
    }

    try {
      await queueService.releaseExpiredHolds(io);
    } catch (err) {
      console.error('[Cron] Error releasing expired holds:', err.message);
    }
  });

  // Schedule nightly purge of soft-deleted report files older than 7 days (Runs at 02:00 AM daily)
  nightlyPurgeTask = cron.schedule('0 2 * * *', async () => {
    try {
      const purged = await fileStore.purgeDeletedFiles(db.store.data.reports, 7);
      if (purged > 0) {
        db.save();
        console.log(`🧹 [Cron] Nightly report disk purge: removed ${purged} file(s) deleted > 7 days ago.`);
      }
    } catch (err) {
      console.error('[Cron] Error purging old deleted report files:', err.message);
    }
  });

  console.log('⏰ [Cron] Background scheduled tasks initialized (missed-slot auto-shift, reminders, hold release, & nightly 7-day report file purge).');
  return { cronTask, nightlyPurgeTask };
}

export default { initCronJobs };

