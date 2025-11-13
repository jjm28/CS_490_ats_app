// services/jobs.service.js
import Jobs from "../models/jobs.js";
import mongoose from "mongoose";

export async function createJob({ userId, payload }) {
  // Prevent empty package
  if (payload.applicationPackage) delete payload.applicationPackage;

  return Jobs.create({ ...payload, userId });
}



export async function getAllJobs({ userId }) {
  return Jobs.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getJob({ userId, id }) {
  return Jobs.findOne({ _id: id, userId }).lean();
}

export async function updateJob({ userId, id, payload }) {
  return Jobs.findOneAndUpdate(
    { _id: id, userId },
    { $set: payload },
    { new: true, runValidators: true }
  ).lean();
}

export async function deleteJob({ userId, id }) {
  return Jobs.findOneAndDelete({ _id: id, userId });
}

export async function getArchivedJobs({ userId }) {
  return Jobs.find({ userId, archived: true }).sort({ updatedAt: -1 }).lean();
}

export async function setArchive({ userId, id, archive, reason }) {
  const payload = archive
    ? { archived: true, archiveReason: reason || "User action", archivedAt: new Date() }
    : { archived: false, archiveReason: null, archivedAt: null };
  return Jobs.findOneAndUpdate({ _id: id, userId }, payload, { new: true });
}

export async function getJobStats(userId) {
  console.log("[getJobStats] starting for user:", userId);

  try {
    const all = await Jobs.find({ userId, archived: false }).lean();
    console.log("[getJobStats] found", all?.length, "jobs");

    // Handle case of no jobs
    if (!all || all.length === 0) {
      console.log("[getJobStats] no jobs found, returning defaults");
      return {
        total: 0,
        byStatus: {},
        responseRate: 0,
        avgOfferTime: 0,
        deadlineAdherence: 100,
        monthlyCounts: {},
        avgStageDurations: {},
      };
    }

    // === Jobs by status ===
    const byStatus = all.reduce((acc, j) => {
      const s = j.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    // === Response rate ===
    const total = all.length;
    const responded = all.filter(
      (j) =>
        j.responseReceived ||
        ["phone_screen", "interview", "offer", "rejected"].includes(j.status)
    ).length;
    const responseRate = total ? Math.round((responded / total) * 100) : 0;

    // === Average time from applied → offer ===
    const offers = all.filter((j) => j.offerDate);
    const avgOfferTime =
      offers.length > 0
        ? Math.round(
          offers.reduce((sum, j) => {
            const appliedAt = (j.statusHistory || []).find(
              (h) => h.status === "applied"
            )?.changedAt;
            if (!appliedAt) return sum;
            const days =
              (new Date(j.offerDate) - new Date(appliedAt)) / 86400000;
            return sum + Math.max(0, days);
          }, 0) / offers.length
        )
        : 0;

    // === Monthly application counts ===
    const monthlyCounts = all.reduce((acc, j) => {
      const appliedAt =
        (j.statusHistory || []).find((h) => h.status === "applied")
          ?.timestamp || j.createdAt;
      if (!appliedAt) return acc;

      const date = new Date(appliedAt);
      const key = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // === Average stage durations ===
    const avgStageDurations = {};
    const stageTimes = {};

    all.forEach((j) => {
      if (!j.statusHistory || j.statusHistory.length < 2) return;

      for (let i = 1; i < j.statusHistory.length; i++) {
        const prev = j.statusHistory[i - 1];
        const curr = j.statusHistory[i];
        const diffDays =
          (new Date(curr.timestamp) - new Date(prev.timestamp)) / 86400000;

        if (!stageTimes[prev.status]) stageTimes[prev.status] = [];
        stageTimes[prev.status].push(Math.max(0, diffDays));
      }
    });

    for (const [status, times] of Object.entries(stageTimes)) {
      avgStageDurations[status] = Math.round(
        times.reduce((a, b) => a + b, 0) / times.length
      );
    }

    // === Deadline adherence ===
    let deadlineAdherence = 100; // default
    const jobsWithDeadlines = all.filter((j) => j.applicationDeadline);

    if (jobsWithDeadlines.length > 0) {
      const onTimeCount = jobsWithDeadlines.filter((j) => {
        const deadline = new Date(j.applicationDeadline);
        const now = new Date();

        // 1️⃣ if job still active and deadline hasn’t passed → on time
        if (!["offer", "rejected"].includes(j.status) && deadline > now) {
          return true;
        }

        // 2️⃣ otherwise, see if user acted before the deadline
        const history = j.statusHistory || [];
        const appliedEvent = history.find((h) => h.status === "applied");
        const actionDate = appliedEvent?.timestamp || j.createdAt;

        return new Date(actionDate) <= deadline;
      }).length;

      deadlineAdherence = Math.round(
        (onTimeCount / jobsWithDeadlines.length) * 100
      );
    }

    console.log("[getJobStats] returning computed stats");

    return {
      total,
      byStatus,
      responseRate,
      avgOfferTime,
      deadlineAdherence,
      monthlyCounts,
      avgStageDurations,
    };
  } catch (err) {
    console.error("[getJobStats] ERROR:", err);
    throw err;
  }
}

/**
 * Update job status and add entry to statusHistory
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.id - Job ID
 * @param {string} params.status - New status value
 * @param {string} [params.note] - Optional note about the status change
 * @returns {Promise<Object|null>} Updated job or null if not found
 */
export async function updateJobStatus({ userId, id, status, note }) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  const updateData = {
    status,
    $push: {
      statusHistory: {
        status,
        timestamp: new Date(),
        ...(note && { note }),
      },
    },
  };

  const job = await Jobs.findOneAndUpdate({ _id: id, userId }, updateData, {
    new: true,
    runValidators: true,
  }).lean();

  return job;
}

/**
 * Bulk update job statuses for multiple jobs
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string[]} params.jobIds - Array of job IDs to update
 * @param {string} params.status - New status value
 * @param {string} [params.note] - Optional note about the status change
 * @returns {Promise<Object>} Object with modifiedCount and updated jobs array
 */
export async function bulkUpdateJobStatus({ userId, jobIds, status, note }) {
  // Filter for valid ObjectIds only
  const validIds = jobIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    return { modifiedCount: 0, jobs: [] };
  }

  const timestamp = new Date();
  const historyEntry = {
    status,
    timestamp,
    ...(note && { note }),
  };

  // Perform bulk update
  const result = await Jobs.updateMany(
    {
      _id: { $in: validIds },
      userId,
    },
    {
      status,
      $push: { statusHistory: historyEntry },
    }
  );

  // Fetch the updated jobs to return to client
  const jobs = await Jobs.find({
    _id: { $in: validIds },
    userId,
  })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    modifiedCount: result.modifiedCount,
    jobs,
  };
}

/**
 * Get jobs filtered by status (enhanced version of getAllJobs)
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} [params.status] - Optional status to filter by
 * @returns {Promise<Array>} Array of jobs
 */
export async function getJobsByStatus({ userId, status }) {
  const filter = { userId };

  // Add status filter if provided
  if (status) {
    filter.status = status;
  }

  const jobs = await Jobs.find(filter).sort({ updatedAt: -1 }).lean();
  return jobs;
}

export async function addApplicationHistory({ userId, id, action }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;
    job.applicationHistory.push({
      action: action.trim(),
      timestamp: new Date()
    });
    await job.save();
    return job;
  } catch (err) {
    console.error('Error in addApplicationHistory service:', err);
    throw err;
  }
}

export async function updateApplicationHistory({ userId, id, historyIndex, action }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    if (historyIndex >= job.applicationHistory.length) {
      return null;
    }

    job.applicationHistory[historyIndex].action = action.trim();
    // Keep original timestamp

    await job.save();
    return job;
  } catch (err) {
    console.error('Error in updateApplicationHistory service:', err);
    throw err;
  }
}

export async function deleteApplicationHistory({ userId, id, historyIndex }) {
  try {
    const job = await Jobs.findOne({ _id: id, userId });
    if (!job) return null;

    if (historyIndex >= job.applicationHistory.length) {
      return null;
    }

    job.applicationHistory.splice(historyIndex, 1);

    await job.save();
    return job;
  } catch (err) {
    console.error('Error in deleteApplicationHistory service:', err);
    throw err;
  }
}