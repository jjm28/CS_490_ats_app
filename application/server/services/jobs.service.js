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
    const all = await Jobs.find({ userId }).lean();
    if (!all || all.length === 0) {
      return {
        total: 0,
        byStatus: {},
        applicationsSent: 0,
        interviewsScheduled: 0,
        offersReceived: 0,
        overallConversion: 0,
        responseRate: 0,
        avgOfferTime: 0,
        deadlineAdherence: 100,
        monthlyCounts: {},
        avgStageDurations: {},
        averageResponseTimeDisplay: "—",
        conversion: {
          applyToPhone: 0,
          applyToInterview: 0,
          applyToOffer: 0,
          phoneToInterview: 0,
          interviewToOffer: 0,
        },
        applicationTrend7Days: {
          Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
        },
        successPatterns: {
          mostActiveDay: "N/A",
          interviewRate: "No interviews yet",
          avgResponse: "—"
        }
      };
    }

    // =======================================
    // BASIC COUNTS
    // =======================================
    let applicationsSent = 0;
    let interviewsScheduled = 0;
    let offersReceived = 0;

    for (const job of all) {
      const history = job.statusHistory || [];
      if (history.some(h => h.status === "applied")) applicationsSent++;
      if (history.some(h => h.status === "interview")) interviewsScheduled++;
      if (history.some(h => h.status === "offer")) offersReceived++;
    }

    const byStatus = all.reduce((acc, j) => {
      const s = j.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const total = all.length;

    // =======================================
    // TIME TO FIRST RESPONSE
    // =======================================
    let responseMinutesList = [];

    for (const job of all) {
      const hist = job.statusHistory || [];
      const applied = hist.find(h => h.status === "applied");
      if (!applied || !applied.timestamp) continue;

      const appliedAt = new Date(applied.timestamp);
      if (isNaN(appliedAt)) continue;

      const responses = hist
        .filter(h =>
          ["phone_screen", "interview", "rejected", "offer"].includes(h.status)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (responses.length === 0) continue;

      const firstResponse = new Date(responses[0].timestamp);
      if (isNaN(firstResponse)) continue;

      const diffMs = firstResponse - appliedAt;
      if (diffMs < 0) continue;

      responseMinutesList.push(diffMs / 60000);
    }

    let averageResponseTimeDisplay = "—";
    if (responseMinutesList.length > 0) {
      const avgMin =
        responseMinutesList.reduce((a, b) => a + b, 0) /
        responseMinutesList.length;

      if (avgMin < 60) {
        averageResponseTimeDisplay = `${Math.round(avgMin)} minutes`;
      } else if (avgMin < 48 * 60) {
        averageResponseTimeDisplay = `${Math.round(avgMin / 60)} hours`;
      } else {
        averageResponseTimeDisplay = `${Math.round(avgMin / 1440)} days`;
      }
    }

    // =======================================
    // CONVERSION FUNNEL (ENTRY-BASED)
    // =======================================
    let appliedCount = 0;
    let phoneCount = 0;
    let interviewCount = 0;
    let offerCount = 0;

    for (const job of all) {
      const hist = job.statusHistory || [];
      if (hist.some(h => h.status === "applied")) appliedCount++;
      if (hist.some(h => h.status === "phone_screen")) phoneCount++;
      if (hist.some(h => h.status === "interview")) interviewCount++;
      if (hist.some(h => h.status === "offer")) offerCount++;
    }

    const conversion = {
      applyToPhone: appliedCount ? Math.round((phoneCount / appliedCount) * 100) : 0,
      applyToInterview: appliedCount ? Math.round((interviewCount / appliedCount) * 100) : 0,
      applyToOffer: appliedCount ? Math.round((offerCount / appliedCount) * 100) : 0,
      phoneToInterview: phoneCount ? Math.round((interviewCount / phoneCount) * 100) : 0,
      interviewToOffer: interviewCount ? Math.round((offerCount / interviewCount) * 100) : 0,
    };

    const overallConversion =
      applicationsSent > 0
        ? Math.round((offersReceived / applicationsSent) * 100)
        : 0;

    // =======================================
    // 7-DAY TREND (SAFE VERSION)
    // =======================================
    const last7Days = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    for (const job of all) {
      if (!job.createdAt) continue;
      const created = new Date(job.createdAt);
      if (isNaN(created)) continue;

      const diff = (Date.now() - created.getTime()) / 86400000;
      if (diff < 0 || diff > 6) continue;

      const day = created.toLocaleDateString("en-US", { weekday: "short" });
      if (last7Days[day] !== undefined) {
        last7Days[day]++;
      }
    }

    // =======================================
    // SUCCESS PATTERNS FOR DEMO
    // =======================================
    const successPatterns = {
      mostActiveDay:
        Object.entries(last7Days).sort((a, b) => b[1] - a[1])[0][0] || "N/A",
      interviewRate:
        interviewsScheduled > 0
          ? `${interviewsScheduled} interviews so far`
          : "No interviews yet",
      avgResponse: averageResponseTimeDisplay
    };

    // =======================================
    // RESPONSE RATE
    // =======================================
    const respondedCount = all.filter(j =>
      j.responseReceived ||
      ["phone_screen", "interview", "offer", "rejected"].includes(j.status)
    ).length;

    const responseRate = total ? Math.round((respondedCount / total) * 100) : 0;

    return {
      total,
      byStatus,
      applicationsSent,
      interviewsScheduled,
      offersReceived,
      overallConversion,
      responseRate,
      avgOfferTime: 0, // not needed for demo now
      deadlineAdherence: 100,
      monthlyCounts: {},
      avgStageDurations: {},
      averageResponseTimeDisplay,
      conversion,
      applicationTrend7Days: last7Days,
      successPatterns
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