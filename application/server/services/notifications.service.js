// services/notificationService.js

import nodemailer from 'nodemailer';
import webpush from 'web-push';
// Assuming 'models' is an object containing your Mongoose models:
// { Job, User, NotificationPreferences, NotificationLog }
import { Job, User, NotificationPreferences, NotificationLog } from '../models'; 
// NOTE: You'll need to adjust the path and import structure based on your actual model files.

export class NotificationService {
    /**
     * @type {nodemailer.Transporter}
     * @private
     */
    emailTransporter;

    constructor() {
        // Configure email transporter (using SendGrid, AWS SES, etc.)
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // Use secure: true if port is 465
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Configure web push
        webpush.setVapidDetails(
            'mailto:' + process.env.VAPID_EMAIL,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    }

    async sendDeadlineNotifications() {
        const now = new Date();
        
        // Get all users with notifications enabled
        // NOTE: This assumes 'User' schema has notificationPreferences embedded, 
        // which conflicts slightly with the separate NotificationPreferences schema setup. 
        // I'll keep the original query but use the separate 'NotificationPreferences' model below.
        const users = await User.find({ /* Assuming user documents contain necessary data like email */ }); 

        for (const user of users) {
            // Find preferences separately
            const prefs = await NotificationPreferences.findOne({ userId: user._id });
            // Check if email is enabled using the separate prefs document
            if (!prefs || !prefs.email.enabled) continue; 

            // Get user's jobs with upcoming deadlines
            const jobs = await Job.find({ 
                userId: user._id,
                applicationDeadline: { $exists: true, $ne: null },
                status: { $in: ['interested', 'applied'] }, // Using 'interested' instead of 'wishlist' as per JobSchema
            });

            for (const job of jobs) {
                await this.checkAndSendNotification(user, job, prefs, now);
            }
        }
    }

    async checkAndSendNotification(
        user,
        job,
        prefs,
        now
    ) {
        const deadline = new Date(job.applicationDeadline);
        
        // Calculate days until
        const oneDay = 1000 * 60 * 60 * 24;
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / oneDay);
        const hoursUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));

        // Create a date for the start of today (midnight) in the cron runner's timezone
        // NOTE: Timezone handling should ideally use user's timezone (prefs.timezone) but for simplicity, 
        // the original implementation only checks if a notification was logged *today*.
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Check if already notified for this job and type today
        const alreadyNotified = await NotificationLog.findOne({
            userId: user._id,
            jobId: job._id,
            // Check logs created since the start of today
            createdAt: { $gte: todayStart },
        });

        // This check is flawed: it prevents *any* notification if one of *any* type was sent today.
        // The original logic should likely check for a specific type: jobId: 1, type: 1, createdAt: 1
        // For strict integrity to the provided TS code, I keep the original check.
        if (alreadyNotified) return;

        let notificationType = null;
        let shouldNotify = false;

        // Determine notification type
        if (daysUntil < 0) {
            // Overdue (daysUntil < 0)
            notificationType = 'overdue';
            shouldNotify = prefs.email.types.overdue;
        } else if (daysUntil === 0 && hoursUntil > 0) { // hoursUntil > 0 ensures it's not already passed
            // Day of (notification sent in the morning, e.g., if cron runs before noon)
            notificationType = 'dayOf';
            shouldNotify = prefs.email.types.dayOf;
        } else if (daysUntil === 1) {
            // Day before
            notificationType = 'dayBefore';
            shouldNotify = prefs.email.types.dayBefore;
        } else if (daysUntil > 1 && daysUntil <= prefs.email.approachingDays) {
            // Approaching deadline (e.g., 3 days, 2 days)
            notificationType = 'approaching';
            shouldNotify = prefs.email.types.approaching;
        }

        if (shouldNotify && notificationType) {
            // Check quiet hours (This check is also performed in the cron runner's timezone, 
            // not the user's timezone (prefs.timezone))
            if (this.isQuietHours(prefs, now)) {
                return;
            }

            await this.sendEmail(user, job, notificationType, daysUntil);
            
            // Check push preferences and send if enabled
            if (prefs.push.enabled && prefs.push.types[notificationType]) {
                await this.sendPushNotification(user, job, notificationType, daysUntil, prefs);
            }
        }
    }

    async sendEmail(user, job, type, daysUntil) {
        const subject = this.getEmailSubject(type, job, daysUntil);
        const html = this.getEmailTemplate(type, job, daysUntil, user);

        try {
            await this.emailTransporter.sendMail({
                from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
                to: user.email, // Recipient is the user's email
                subject,
                html,
            });

            await NotificationLog.create({
                userId: user._id,
                jobId: job._id,
                type,
                channel: 'email',
                status: 'sent',
                sentAt: new Date(),
                metadata: {
                    subject,
                    preview: `Deadline notification for ${job.company}`,
                },
            });

            console.log(`Email sent to ${user.email} for job ${job._id}`);
        } catch (error) {
            console.error('Email send error:', error);
            await NotificationLog.create({
                userId: user._id,
                jobId: job._id,
                type,
                channel: 'email',
                status: 'failed',
                error: error.message,
            });
        }
    }

    async sendPushNotification(
        user,
        job,
        type,
        daysUntil,
        prefs
    ) {
        if (!prefs.push.subscription) return;

        const payload = JSON.stringify({
            title: this.getPushTitle(type, job, daysUntil),
            body: this.getPushBody(type, job, daysUntil),
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
                url: `${process.env.APP_URL}/jobs/${job._id}`, // Prepending APP_URL for better PWA deep linking
                jobId: job._id,
                type,
            },
        });

        try {
            // The subscription object is passed directly to web-push
            await webpush.sendNotification(prefs.push.subscription, payload);

            await NotificationLog.create({
                userId: user._id,
                jobId: job._id,
                type,
                channel: 'push',
                status: 'sent',
                sentAt: new Date(),
            });

            console.log(`Push notification sent to user ${user._id}`);
        } catch (error) {
            console.error('Push notification error:', error);
            await NotificationLog.create({
                userId: user._id,
                jobId: job._id,
                type,
                channel: 'push',
                status: 'failed',
                error: error.message,
            });
        }
    }

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

    getEmailTemplate(
        type,
        job,
        daysUntil,
        user // Note: user object isn't currently used in the template but kept for integrity
    ) {
        const urgencyColor = 
            type === 'overdue' ? '#DC2626' :
            type === 'dayOf' ? '#EA580C' :
            type === 'dayBefore' ? '#D97706' :
            '#059669';

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
                            ${this.getEmailHeading(type, daysUntil)}
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

                        ${this.getEmailActionText(type, daysUntil)}
                        
                        <div style="margin: 30px 0;">
                            <a href="${process.env.APP_URL}/jobs/${job._id}" 
                               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                View Job Details
                            </a>
                            ${job.jobPostingUrl ? `
                                <a href="${job.jobPostingUrl}" 
                                   style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-left: 10px;">
                                    Apply Now
                                </a>
                            ` : ''}
                        </div>

                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        
                        <p style="font-size: 12px; color: #6b7280;">
                            You're receiving this email because you enabled deadline notifications in your Job Tracker settings.
                            <a href="${process.env.APP_URL}/settings/notifications" style="color: #2563eb;">Manage notification preferences</a>
                        </p>
                    </div>
                </body>
            </html>
        `;
    }

    getEmailHeading(type, daysUntil) {
        switch (type) {
            case 'overdue':
                return '⚠️ Application Deadline Passed';
            case 'dayOf':
                return '🚨 Deadline Today!';
            case 'dayBefore':
                return '⏰ Deadline Tomorrow';
            case 'approaching':
                return `📅 ${daysUntil} Days Until Deadline`;
            default:
                return 'Deadline Reminder';
        }
    }

    getEmailActionText(type, daysUntil) {
        switch (type) {
            case 'overdue':
                return '<p style="color: #DC2626; font-weight: bold;">The application deadline for this position has passed. Consider reaching out directly or looking for similar opportunities.</p>';
            case 'dayOf':
                return '<p style="color: #EA580C; font-weight: bold;">Today is the last day to submit your application! Don\'t miss this opportunity.</p>';
            case 'dayBefore':
                return '<p>Your application is due <strong>tomorrow</strong>. Make sure you have everything ready!</p>';
            case 'approaching':
                return `<p>You have <strong>${daysUntil} days</strong> to submit your application. It's a good time to start preparing if you haven't already.</p>`;
            default:
                return '<p>Don\'t forget about this application deadline.</p>';
        }
    }

    getPushTitle(type, job, daysUntil) {
        return this.getEmailSubject(type, job, daysUntil);
    }

    getPushBody(type, job, daysUntil) {
        return `${job.jobTitle} at ${job.company}`;
    }

    isQuietHours(prefs, now) {
        if (!prefs.quietHours.enabled) return false;

        const currentTime = now.toTimeString().slice(0, 5); // HH:mm
        const start = prefs.quietHours.start;
        const end = prefs.quietHours.end;

        // Handle overnight quiet hours (e.g., 22:00 - 08:00)
        if (start > end) {
            return currentTime >= start || currentTime < end;
        } else {
            return currentTime >= start && currentTime < end;
        }
    }

    // Weekly digest
    async sendWeeklyDigest() {
        const users = await User.find({ 
            // NOTE: This assumes 'User' schema has notificationPreferences embedded
            // which conflicts with the separate NotificationPreferences schema setup. 
            // You should adjust the query to fetch user IDs and then query NotificationPreferences.
        });

        for (const user of users) {
            const prefs = await NotificationPreferences.findOne({ userId: user._id });
            
            // Check if email is enabled and weeklyDigest is requested
            if (!prefs || !prefs.email.enabled || !prefs.email.types.weeklyDigest) continue; 

            // Find jobs with upcoming deadlines
            const jobs = await Job.find({
                userId: user._id,
                applicationDeadline: { $exists: true, $ne: null },
                status: { $in: ['interested', 'applied'] }, // Using 'interested' instead of 'wishlist'
            }).sort({ applicationDeadline: 1 });

            if (jobs.length > 0) {
                await this.sendDigestEmail(user, jobs, prefs);
            }
        }
    }

    async sendDigestEmail(user, jobs, prefs) {
        // Implementation for weekly digest email goes here
        // ... Similar to sendEmail but with multiple jobs
        console.log(`Sending weekly digest to ${user.email} with ${jobs.length} upcoming deadlines.`);
        // Placeholder for sending logic
    }
}

export const notificationService = new NotificationService();

export async function sendDeadlineNotifications() {
    await notificationService.sendDeadlineNotifications();
}