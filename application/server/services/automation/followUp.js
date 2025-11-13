// services/automation/followUp.js
import Jobs from "../../models/jobs.js";

/**
 * config shape:
 * {
 *   "jobId": "JOB_ID",
 *   "message": "Send follow-up email",
 *   "interval": "none" | "daily" | "3days" | "weekly"
 * }
 *
 * Behavior:
 *  - When the rule is due (based on rule.schedule in generator/engine),
 *    create a follow-up task and log it in applicationHistory.
 *  - (Optional) interval can be used later to reschedule the rule.
 */
export async function runFollowUpRule(rule) {
  const { userId, config = {} } = rule;
  const {
    jobId,
    message = "Follow up on application",
    interval = "none",
  } = config;

  if (!jobId) {
    console.warn("[automation] follow_up: missing jobId in config");
    return;
  }

  const job = await Jobs.findOne({ _id: jobId, userId });
  if (!job) {
    console.warn(`[automation] follow_up: job not found for ${jobId}`);
    return;
  }

  const now = new Date();

  job.followUpTasks = job.followUpTasks || [];
  job.followUpTasks.push({
    note: message,
    createdAt: now,
    completed: false,
    type: "auto_follow_up",
    interval, // just stored; could be used for future re-scheduling
  });

  job.applicationHistory = job.applicationHistory || [];
  job.applicationHistory.push({
    action: `Automation: follow-up reminder created (${message})`,
    timestamp: now,
  });

  await job.save();
  console.log(`[automation] follow_up: reminder created for job ${job._id}`);
}