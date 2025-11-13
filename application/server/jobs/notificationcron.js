// ============================================
// FILE: backend/jobs/notificationCron.js
// ============================================
// This sets up the daily cron job to check deadlines

import cron from 'node-cron';
import notificationService from '../services/notifications.service.js';

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
  
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily deadline notification check...');
    await notificationService.checkAndSendDeadlineNotifications();
  });

  console.log('✅ Notification cron job scheduled (runs daily at 9:00 AM)');
}