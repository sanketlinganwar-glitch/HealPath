import cron from 'node-cron';
import queueService from './queueService.js';

let cronTask = null;

/**
 * Initialize background scheduled tasks
 * - Runs every minute to auto-shift missed appointments past the grace period
 */
export function initCronJobs(io) {
  if (cronTask) {
    cronTask.stop();
  }

  // Schedule task every minute: '* * * * *'
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await queueService.processMissedSlots(io);
    } catch (err) {
      console.error('[Cron] Error processing missed slots:', err.message);
    }
  });

  console.log('⏰ [Cron] Missed-slot auto-shift job initialized (runs every 60 seconds).');
  return cronTask;
}

export default { initCronJobs };
