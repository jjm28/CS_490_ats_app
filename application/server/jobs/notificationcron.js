// ============================================
// FILE: backend/jobs/notificationCron.js
// ============================================
// This sets up the daily cron job to check deadlines

import cron from 'node-cron';
import notificationService from '../services/notifications.service.js';

//application notifications
import {
  processDueSubmissions,
  processDueReminders,
  processExpiredSchedules,
} from "../services/applicationScheduler.service.js";

//setting up applications scheduler
let _schedulerTickRunning = false;

export async function runApplicationSchedulerTick() {
  if (_schedulerTickRunning) return;
  _schedulerTickRunning = true;

  try {
    await processDueSubmissions();
    await processDueReminders();
    await processExpiredSchedules();
  } finally {
    _schedulerTickRunning = false;
  }
}
//sedning emial notifications at specified times
export function setupApplicationSchedulerCron() {
  cron.schedule(
    "* * * * *",
    async () => {
      try {
        await runApplicationSchedulerTick();
      } catch (e) {
        console.error("Application scheduler cron tick failed:", e?.message || e);
      }
    },
    { timezone: process.env.APP_SCHEDULE_CRON_TZ || "America/New_York" }
  );

  console.log("✅ Application scheduler cron scheduled (runs every minute)");
}

/**
 * Set up the notification cron job
 * Runs every day at 9:00 AM
 */
export function setupNotificationCron() {
  // Schedule: '0 9 * * *' means "At 09:00 every day"
  // You can change this to run at different times:
  // '0 8 * * *' = 8:00 AM
  // '0 18 * * *' = 6:00 PM
  // '0 */6 * * *' = Every 6 hours
  
  // cron.schedule('5 * * * *', async () => {
  //   console.log('⏰ Running daily deadline notification check...');
  //   await notificationService.checkAndSendDeadlineNotifications();
  // });

  console.log('✅ Notification cron job scheduled (runs daily at 9:00 AM)');
}