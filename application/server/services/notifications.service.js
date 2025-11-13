// ============================================
// FILE: backend/services/notificationService.js
// ============================================
// This is the main notification service that handles sending emails

import nodemailer from 'nodemailer';
import { getDb } from '../db/connection.js'; // Adjust path to your DB connection file
import { ObjectId } from 'mongodb';

class NotificationService {
  constructor() {
    // Email transporter setup (using Gmail as example)
    // You can also use SendGrid, AWS SES, etc.
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail', // or 'SendGrid', etc.
      auth: {
        user: process.env.EMAIL_USER, // your-email@gmail.com
        pass: process.env.EMAIL_PASSWORD, // your app password
      },
    });
  }

  /**
   * Main function to check all deadlines and send notifications
   * This runs every day via cron job
   */
  async checkAndSendDeadlineNotifications() {
    try {
      console.log('🔔 Checking deadline notifications...');
      
      // Get all users with notification preferences enabled
      const users = await this.getUsersWithNotificationsEnabled();
      
      for (const user of users) {
        await this.processUserNotifications(user);
      }
      
      console.log('✅ Deadline notifications check complete');
    } catch (error) {
      console.error('❌ Error in notification service:', error);
    }
  }

  /**
   * Get users who have notifications enabled
   */
  async getUsersWithNotificationsEnabled() {
    const db = getDb();
    
    // Find all users with notifications enabled
    const preferences = await db.collection('notificationpreferences').find({
      'email.enabled': true,
    }).toArray();
    
    // Get user details for each preference
    const usersWithPreferences = [];
    for (const pref of preferences) {
      // userId is stored as String in your app
      const user = await db.collection('users').findOne({ 
        _id: String(pref.userId)
      });
      
      if (user) {
        usersWithPreferences.push({
          _id: user._id,
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
          preferences: pref,
        });
      }
    }
    
    return usersWithPreferences;
  }

  /**
   * Process notifications for a single user
   */
  async processUserNotifications(user) {
    const db = getDb();
    
    // Get all user's jobs with deadlines
    // userId is stored as String in jobs collection
    const jobs = await db.collection('jobs').find({
      userId: String(user._id),
      applicationDeadline: { $exists: true, $ne: null },
      status: { $in: ['wishlist', 'applied'] }, // Don't notify for rejected/accepted
    }).toArray();

    const now = new Date();
    
    for (const job of jobs) {
      await this.checkJobDeadline(user, job, now);
    }
  }

  /**
   * Check if a job needs a notification sent
   */
  async checkJobDeadline(user, job, now) {
    const db = getDb();
    
    const deadline = new Date(job.applicationDeadline);
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.ceil((deadline - now) / (1000 * 60 * 60));

    // Check if already notified today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const alreadyNotified = await db.collection('notificationlogs').findOne({
      userId: String(user._id),
      jobId: String(job._id),
      createdAt: { $gte: startOfDay },
    });

    if (alreadyNotified) return;

    // Determine notification type
    let notificationType = null;
    let shouldNotify = false;

    if (daysUntil < 0) {
      // Overdue
      notificationType = 'overdue';
      shouldNotify = user.preferences.email.types.overdue;
    } else if (daysUntil === 0 && hoursUntil <= 12) {
      // Day of (morning notification)
      notificationType = 'dayOf';
      shouldNotify = user.preferences.email.types.dayOf;
    } else if (daysUntil === 1) {
      // Day before
      notificationType = 'dayBefore';
      shouldNotify = user.preferences.email.types.dayBefore;
    } else if (daysUntil <= user.preferences.email.approachingDays) {
      // Approaching deadline
      notificationType = 'approaching';
      shouldNotify = user.preferences.email.types.approaching;
    }

    if (shouldNotify && notificationType) {
      await this.sendDeadlineEmail(user, job, notificationType, daysUntil);
    }
  }

  /**
   * Send the actual email notification
   */
  async sendDeadlineEmail(user, job, type, daysUntil) {
    const db = getDb();
    
    const subject = this.getEmailSubject(type, job, daysUntil);
    const html = this.getEmailTemplate(type, job, daysUntil, user);

    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || '"Job Tracker" <noreply@jobtracker.com>',
        to: user.email,
        subject,
        html,
      });

      // Log successful send
      await db.collection('notificationlogs').insertOne({
        userId: String(user._id),
        jobId: String(job._id),
        type,
        channel: 'email',
        status: 'sent',
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          subject,
          preview: `Deadline notification for ${job.company}`,
        },
      });

      console.log(`📧 Email sent to ${user.email} for job ${job._id}`);
    } catch (error) {
      console.error('❌ Email send error:', error);
      
      // Log failed send
      await db.collection('notificationlogs').insertOne({
        userId: String(user._id),
        jobId: String(job._id),
        type,
        channel: 'email',
        status: 'failed',
        createdAt: new Date(),
        updatedAt: new Date(),
        error: error.message,
      });
    }
  }

  /**
   * Generate email subject line
   */
  getEmailSubject(type, job, daysUntil) {
    switch (type) {
      case 'overdue':
        return `⚠️ Overdue: ${job.company} application deadline passed`;
      case 'dayOf':
        return `🚨 Today: Apply to ${job.company} - ${job.jobTitle}`;
      case 'dayBefore':
        return `⏰ Tomorrow: ${job.company} application deadline`;
      case 'approaching':
        return `📅 ${daysUntil} days left: ${job.company} application deadline`;
      default:
        return `Deadline reminder: ${job.company}`;
    }
  }

  /**
   * Generate HTML email template
   */
  getEmailTemplate(type, job, daysUntil, user) {
    const urgencyColor = 
      type === 'overdue' ? '#DC2626' :
      type === 'dayOf' ? '#EA580C' :
      type === 'dayBefore' ? '#D97706' :
      '#059669';

    const heading = 
      type === 'overdue' ? '⚠️ Application Deadline Passed' :
      type === 'dayOf' ? '🚨 Deadline Today!' :
      type === 'dayBefore' ? '⏰ Deadline Tomorrow' :
      `📅 ${daysUntil} Days Until Deadline`;

    const actionText =
      type === 'overdue' 
        ? 'The application deadline for this position has passed. Consider reaching out directly or looking for similar opportunities.'
        : type === 'dayOf'
        ? "Today is the last day to submit your application! Don't miss this opportunity."
        : type === 'dayBefore'
        ? 'Your application is due <strong>tomorrow</strong>. Make sure you have everything ready!'
        : `You have <strong>${daysUntil} days</strong> to submit your application. It's a good time to start preparing if you haven't already.`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">
              ${heading}
            </h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="margin-top: 0; color: #111827;">
              ${job.jobTitle}
            </h2>
            
            <p style="font-size: 18px; color: #374151; margin: 10px 0;">
              <strong>${job.company}</strong>
            </p>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Application Deadline:</strong> ${new Date(job.applicationDeadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${job.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${job.location}</p>` : ''}
              ${job.type ? `<p style="margin: 5px 0;"><strong>Type:</strong> ${job.type}</p>` : ''}
            </div>

            <p style="color: ${urgencyColor}; font-size: 16px;">
              ${actionText}
            </p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Jobs" 
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                View Job Details
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6b7280;">
              You're receiving this email because you enabled deadline notifications in your Job Tracker settings.
              <a href="${process.env.CORS_ORIGIN || 'http://localhost:5173'}/Notifications" style="color: #2563eb;">Manage notification preferences</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }
}

export default new NotificationService();