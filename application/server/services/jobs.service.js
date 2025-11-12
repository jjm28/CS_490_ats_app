import Jobs from "../models/jobs.js";
import mongoose from "mongoose";

/**
 * Create a new job document
 */
export async function createJob({ userId, payload }) {
  const autoDaysRaw = payload.autoArchiveDays;
  const autoArchiveDays = !isNaN(Number(autoDaysRaw))
    ? Number(autoDaysRaw)
    : 60;

  const jobData = {
    userId,
    jobTitle: payload.jobTitle,
    company: payload.company || "",
    industry: payload.industry || "",
    type: payload.type,
    location: payload.location || "",
    salaryMin: payload.salaryMin,
    salaryMax: payload.salaryMax,
    jobPostingUrl: payload.jobPostingUrl || "",
    applicationDeadline: payload.applicationDeadline || null,
    description: payload.description || "",
    autoArchiveDays,
  };

  const job = await Jobs.create(jobData);
  return job;
}

/**
 * Get all jobs for a user, optionally filtered (e.g., archived)
 */
export async function getAllJobs({ userId, filter = {} }) {
  return Jobs.find({ userId, ...filter }).sort({ createdAt: -1 }).lean();
}

/**
 * Get a single job by ID (with fallback)
 */
export async function getJob({ userId, id }) {
  let job = await Jobs.findOne({ _id: id, userId }).lean();
  if (!job) job = await Jobs.findOne({ _id: id }).lean();
  return job;
}

/**
 * Update a single job (with fallback)
 */
export async function updateJob({ userId, id, payload }) {
  const updateData = {
    ...payload,
    ...(payload.industry !== undefined && { industry: payload.industry }),
  };

  let updated = await Jobs.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    updated = await Jobs.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();
  }

  return updated;
}

/**
 * Delete a job (with fallback)
 */
export async function deleteJob({ userId, id }) {
  let deleted = await Jobs.findOneAndDelete({ _id: id, userId });
  if (!deleted) deleted = await Jobs.findOneAndDelete({ _id: id });
  return deleted;
}

/**
 * Update job status and append to statusHistory (persistent + fallback)
 */
export async function updateJobStatus({ userId, id, status, note }) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const updateData = {
    status,
    $push: {
      statusHistory: {
        status,
        changedAt: new Date(),
        ...(note && { note }),
      },
    },
  };

  let job = await Jobs.findOneAndUpdate({ _id: id, userId }, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  if (!job) {
    job = await Jobs.findOneAndUpdate({ _id: id }, updateData, {
      new: true,
      runValidators: true,
    }).lean();
  }

  return job;
}

/**
 * Bulk update multiple job statuses (persistent + fallback)
 */
export async function bulkUpdateJobStatus({ userId, jobIds, status, note }) {
  const validIds = jobIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return { modifiedCount: 0, jobs: [] };

  const historyEntry = {
    status,
    changedAt: new Date(),
    ...(note && { note }),
  };

  // Try userId-scoped update first
  let result = await Jobs.updateMany(
    { _id: { $in: validIds }, userId },
    { status, $push: { statusHistory: historyEntry } }
  );

  // Fallback if nothing was modified (e.g. dev mode)
  if (result.modifiedCount === 0) {
    result = await Jobs.updateMany(
      { _id: { $in: validIds } },
      { status, $push: { statusHistory: historyEntry } }
    );
  }

  const jobs = await Jobs.find({ _id: { $in: validIds } })
    .sort({ updatedAt: -1 })
    .lean();

  return { modifiedCount: result.modifiedCount, jobs };
}

/**
 * Get jobs by a specific status
 */
export async function getJobsByStatus({ userId, status }) {
  const filter = { userId };
  if (status) filter.status = status;
  return Jobs.find(filter).sort({ updatedAt: -1 }).lean();
}

/**
 * Automatically archive jobs past their autoArchiveDays threshold
 */
export async function autoArchiveOldJobs(userId) {
  const now = new Date();
  const jobs = await Jobs.find({ userId, archived: false });
  let count = 0;

  for (const job of jobs) {
    const daysLimit = job.autoArchiveDays || 60;
    const createdAt = new Date(job.createdAt);
    const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (diffDays > daysLimit) {
      await Jobs.updateOne(
        { _id: job._id },
        {
          $set: {
            archived: true,
            archiveReason: `Auto-archived after ${daysLimit} days`,
            archivedAt: now,
          },
        }
      );
      count++;
    }
  }

  return count;
}

/**
 * Application History management
 */
export async function addApplicationHistory({ userId, id, action }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    job.applicationHistory.push({
      action: action.trim(),
      timestamp: new Date(),
    });

    await job.save();
    return job;
  } catch (err) {
    console.error("Error in addApplicationHistory service:", err);
    throw err;
  }
}

export async function updateApplicationHistory({ userId, id, historyIndex, action }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    if (historyIndex >= job.applicationHistory.length) return null;

    job.applicationHistory[historyIndex].action = action.trim();
    await job.save();
    return job;
  } catch (err) {
    console.error("Error in updateApplicationHistory service:", err);
    throw err;
  }
}

export async function deleteApplicationHistory({ userId, id, historyIndex }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    if (historyIndex >= job.applicationHistory.length) return null;

    job.applicationHistory.splice(historyIndex, 1);
    await job.save();
    return job;
  } catch (err) {
    console.error("Error in deleteApplicationHistory service:", err);
    throw err;
  }
}

/**
 * Generate job statistics for analytics dashboard
 */
export async function getJobStats(userId) {
  const jobs = await Jobs.find({ userId, archived: false }).lean();
  const total = jobs.length;

  // Group by status
  const byStatus = jobs.reduce((acc, job) => {
    acc[job.status || "unspecified"] =
      (acc[job.status || "unspecified"] || 0) + 1;
    return acc;
  }, {});

  // Response rate
  const progressedStatuses = ["phone_screen", "interview", "offer", "rejected"];
  const respondedCount = jobs.filter((j) =>
    progressedStatuses.includes(j.status)
  ).length;
  const responseRate =
    total > 0 ? ((respondedCount / total) * 100).toFixed(1) : 0;

  // Average time to offer
  const offers = jobs.filter(
    (j) => j.status === "offer" && Array.isArray(j.statusHistory)
  );
  const avgOfferTime =
    offers.length > 0
      ? Math.round(
          offers.reduce((sum, job) => {
            const applied = job.statusHistory.find((s) => s.status === "applied");
            const offered = job.statusHistory.find((s) => s.status === "offer");
            if (applied && offered) {
              const diff =
                (new Date(offered.changedAt) - new Date(applied.changedAt)) /
                (1000 * 60 * 60 * 24);
              return sum + diff;
            }
            return sum;
          }, 0) / offers.length
        )
      : 0;

  // Average time spent in each stage
  const stageTimes = {};
  const stageCounts = {};
  for (const job of jobs) {
    const history = job.statusHistory || [];
    for (let i = 0; i < history.length - 1; i++) {
      const curr = history[i];
      const next = history[i + 1];
      const diffDays =
        (new Date(next.changedAt) - new Date(curr.changedAt)) /
        (1000 * 60 * 60 * 24);
      if (!stageTimes[curr.status]) {
        stageTimes[curr.status] = 0;
        stageCounts[curr.status] = 0;
      }
      stageTimes[curr.status] += diffDays;
      stageCounts[curr.status] += 1;
    }
  }

  const avgStageDurations = {};
  for (const stage of Object.keys(stageTimes)) {
    avgStageDurations[stage] = Number(
      (stageTimes[stage] / stageCounts[stage]).toFixed(1)
    );
  }

  // Monthly applications
  const monthlyCounts = {};
  for (const job of jobs) {
    if (!job.createdAt) continue;
    const key = new Date(job.createdAt).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  }

  // Deadline adherence
  const deadlines = jobs.filter((j) => j.applicationDeadline);
  const onTime = deadlines.filter(
    (j) => new Date(j.applicationDeadline) > new Date(j.createdAt)
  ).length;
  const deadlineAdherence =
    deadlines.length > 0 ? Math.round((onTime / deadlines.length) * 100) : 0;

  return {
    total,
    byStatus,
    responseRate,
    avgOfferTime,
    avgStageDurations,
    monthlyCounts,
    deadlineAdherence,
  };
}