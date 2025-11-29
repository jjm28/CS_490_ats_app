// automation/actions/checklist.js
import Jobs from "../../models/jobs.js";

/**
 * config shape:
 * {
 *   "jobId": "JOB_ID",
 *   "items": [
 *      { "label": "Research company website" },
 *      { "label": "Customize resume to JD" }
 *   ],
 *   "autoCompleteOnStatus": "applied" // optional
 * }
 */
export async function runChecklistRule(rule) {
  const { userId, config = {} } = rule;
  const { jobId, items = [], autoCompleteOnStatus } = config;

  if (!jobId) {
    console.warn("[automation] checklist: missing jobId in config");
    return;
  }

  const job = await Jobs.findOne({ _id: jobId, userId });
  if (!job) {
    console.warn(`[automation] checklist: job not found for ${jobId}`);
    return;
  }

  const now = new Date();

  // Initialize checklist if needed
  if (!Array.isArray(job.checklist)) {
    job.checklist = [];
  }

  // Add any new items that don't already exist
  const labelsExisting = new Set(job.checklist.map((i) => i.label));
  for (const raw of items) {
    if (!raw?.label || labelsExisting.has(raw.label)) continue;
    job.checklist.push({
      label: raw.label,
      completed: false,
      createdAt: now,
      completedAt: null,
      source: "automation",
    });
  }

  // Auto-complete items if rule says so and status matches
  if (autoCompleteOnStatus && job.status === autoCompleteOnStatus) {
    for (const item of job.checklist) {
      if (!item.completed) {
        item.completed = true;
        item.completedAt = now;
      }
    }
  }

  job.applicationHistory = job.applicationHistory || [];
  job.applicationHistory.push({
    action: "Automation: checklist updated",
    timestamp: now,
  });

  await job.save();
  console.log(`[automation] checklist: updated for job ${job._id}`);
}