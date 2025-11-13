// automation/actions/submissionSchedule.js
import Jobs from "../../models/jobs.js";

const VALID_STATUSES = [
  "interested",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
];

/**
 * config shape:
 * {
 *   "jobId": "single job"       // OR:
 *   "jobIds": ["id1","id2"],    // bulk
 *   "newStatus": "applied",     // default "applied"
 *   "note": "Submitted via automation"
 * }
 */
export async function runSubmissionScheduleRule(rule) {
  const { userId, config = {} } = rule;
  const {
    jobId,
    jobIds,
    newStatus = "applied",
    note = "Automation: scheduled submission executed",
  } = config;

  if (!VALID_STATUSES.includes(newStatus)) {
    console.warn(
      `[automation] submission_schedule: invalid status '${newStatus}'`
    );
    return;
  }

  const ids = Array.isArray(jobIds) && jobIds.length > 0 ? jobIds : jobId ? [jobId] : [];

  if (ids.length === 0) {
    console.warn("[automation] submission_schedule: no jobId(s) provided");
    return;
  }

  const now = new Date();
  const jobs = await Jobs.find({ _id: { $in: ids }, userId });

  for (const job of jobs) {
    const oldStatus = job.status;
    job.status = newStatus;

    // statusHistory
    job.statusHistory = job.statusHistory || [];
    const lastStatus = job.statusHistory[job.statusHistory.length - 1];

    if (!lastStatus || lastStatus.status !== newStatus) {
      job.statusHistory.push({
        status: newStatus,
        timestamp: now,
      });
    }

    // applicationHistory log
    job.applicationHistory = job.applicationHistory || [];
    job.applicationHistory.push({
      action: `${note} (was: ${oldStatus || "unknown"}, now: ${newStatus})`,
      timestamp: now,
    });

    await job.save();
    console.log(
      `[automation] submission_schedule: job ${job._id} -> ${newStatus}`
    );
  }
}