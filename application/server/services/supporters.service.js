// services/supportersService.js
import crypto from "crypto";
import Supporter from "../models/Supporter.js";
import WellbeingCheckin from "../models/WellbeingCheckin.js";
import Jobs from "../models/jobs.js";
import { sendSupporterInviteEmail } from "./emailService.js"; 
import { getDb } from "../db/connection.js";
 const SUPPORTER_PRIVACY_PRESETS = {
  high_level: {
    canSeeProgressSummary: true,
    canSeeCompanyNames: false,
    canSeeInterviewSchedule: false,
    canSeeRejections: false,
    canSeeSalaryInfo: false,
    canSeeNotes: false,
    canSeeWellbeingCheckins: false,
  },
  standard: {
    canSeeProgressSummary: true,
    canSeeCompanyNames: true,
    canSeeInterviewSchedule: true,
    canSeeRejections: true,
    canSeeSalaryInfo: false,
    canSeeNotes: false,
    canSeeWellbeingCheckins: true,
  },
  deep: {
    canSeeProgressSummary: true,
    canSeeCompanyNames: true,
    canSeeInterviewSchedule: true,
    canSeeRejections: true,
    canSeeSalaryInfo: true,
    canSeeNotes: true,
    canSeeWellbeingCheckins: true,
  },
};

/**
 * Get all supporters for a given job seeker (ownerUserId)
 */
export async function listSupporters({ ownerUserId }) {
  const supporters = await Supporter.find({ ownerUserId }).sort({
    createdAt: -1,
  });
  return supporters;
}

/**
 * Invite a supporter for this user.
 */
export async function inviteSupporter({
  ownerUserId,
  fullName,
  email,
  relationship,
  presetKey,
}) {
  const preset =
    SUPPORTER_PRIVACY_PRESETS[presetKey] ||
    SUPPORTER_PRIVACY_PRESETS.standard;

  const inviteToken = crypto.randomBytes(24).toString("hex");

  const supporter = await Supporter.create({
    ownerUserId,
    fullName,
    email,
    relationship: relationship || "other",
    status: "invited",
    invitedAt: new Date(),
    inviteToken,
    permissions: preset,
  });

  // Fetch job seeker info for personalization (optional)
  let jobSeekerName = null;
  try {
    const db = getDb()
      

    const owner = await db.collection("profiles").find({ userId: ownerUserId  })
    
      .toArray();
    if (owner && owner.fullName) {
      jobSeekerName = owner.fullName;
    }
  } catch (e) {
    console.warn("Could not fetch job seeker name for invite email:", e);
  }

  // Fire-and-forget email sending (don't block the main response on failure)
  try {
    await sendSupporterInviteEmail({
      toEmail: email,
      supporterName: fullName,
      jobSeekerName,
      relationship,
      inviteToken,
    });
  } catch (e) {
    console.error("Error sending supporter invite email:", e);
    // You might want to log this to monitoring, but we still return supporter
  }

  return supporter;
}
/**
 * Update supporter permissions / boundaries / status (by job seeker).
 */
export async function updateSupporter({
  ownerUserId,
  supporterId,
  status,
  permissions,
  boundaries,
}) {
  const supporter = await Supporter.findOne({
    _id: supporterId,
    ownerUserId,
  });

  if (!supporter) {
    const err = new Error("Supporter not found");
    err.statusCode = 404;
    throw err;
  }

  if (status) {
    supporter.status = status;
    if (status === "revoked") {
      supporter.inviteToken = null;
    }
  }

  if (permissions) {
    supporter.permissions = {
      ...supporter.permissions.toObject(),
      ...permissions,
    };
  }

  if (boundaries) {
    supporter.boundaries = {
      ...supporter.boundaries.toObject(),
      ...boundaries,
    };
  }

  await supporter.save();
  return supporter;
}

/**
 * Accept a supporter invite via magic-link token.
 */
export async function acceptInviteByToken({ token }) {
  const supporter = await Supporter.findOne({ inviteToken: token });

  if (!supporter || supporter.status === "revoked") {
    const err = new Error("Invalid or expired invite");
    err.statusCode = 404;
    throw err;
  }

  supporter.status = "accepted";
  supporter.acceptedAt = new Date();
  supporter.inviteToken = null;
  await supporter.save();

  return supporter;
}

export async function acceptInviteForUser({ token, supporterUserId }) {
  const supporter = await Supporter.findOne({ inviteToken: token });

  if (!supporter || supporter.status === "revoked") {
    const err = new Error("Invalid or expired invite");
    err.statusCode = 404;
    throw err;
  }

  supporter.status = "accepted";
  supporter.acceptedAt = new Date();
  supporter.inviteToken = null;
  supporter.supporterUserId = supporterUserId;
  await supporter.save();

  return supporter;
}
/**
 * Record that the supporter viewed the dashboard (simple tracking).
 */
export async function markSupporterViewed({ supporterId }) {
  const supporter = await Supporter.findById(supporterId);
  if (!supporter) return null;
  supporter.lastViewedAt = new Date();
  await supporter.save();
  return supporter;
}

/* ------------------------------------------------------------------ */
/*  FAMILY-FRIENDLY PROGRESS SUMMARY                                  */
/* ------------------------------------------------------------------ */

/**
 * Public function used by route: get summary for supporter dashboard.
 */
export async function getSupporterSummary({ supporterId }) {
  const supporter = await Supporter.findById(supporterId);

  if (!supporter) {
    const err = new Error("Supporter not found");
    err.statusCode = 404;
    throw err;
  }

  if (!supporter.permissions?.canSeeProgressSummary) {
    const err = new Error("Supporter is not allowed to view progress summary");
    err.statusCode = 403;
    throw err;
  }

  const ownerUserId = supporter.ownerUserId;

  // 🔁 Load jobs + wellbeing snapshot in parallel
  const [jobs, wellbeingSnapshot] = await Promise.all([
    Jobs.find({ userId: ownerUserId }).lean(),
    getWellbeingSnapshot({ userId: ownerUserId }),
  ]);

  const rawSummary = buildRawSummary(jobs, wellbeingSnapshot);
  const filteredSummary = filterSummaryForSupporter(
    rawSummary,
    supporter.permissions
  );

  supporter.lastViewedAt = new Date();
  await supporter.save();

  return {
    supporter: {
      id: supporter._id.toString(),
      fullName: supporter.fullName,
      relationship: supporter.relationship,
    },
    ownerUserId,
    summary: filteredSummary,
  };
}


/**
 * Build the unfiltered summary from jobs only.
 * You can later extend this to include wellbeing checkins, notes, etc.
 */
function buildRawSummary(jobs, wellbeingSnapshot) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalApplications = jobs.length;

  const applicationsThisWeek = jobs.filter((job) => {
    const appliedAt =
      job.appliedAt || job.createdAt || job.updatedAt || null;
    if (!appliedAt) return false;
    const date = new Date(appliedAt);
    return date >= oneWeekAgo && date <= now;
  }).length;

  const offers = jobs.filter((job) => {
    const status = (job.status || "").toLowerCase();
    return (
      status === "offer" ||
      status === "offer_received" ||
      status === "accepted_offer"
    );
  }).length;

  const interviewsScheduled = jobs.filter((job) => {
    if (job.nextInterviewDate) {
      return new Date(job.nextInterviewDate) >= now;
    }
    const status = (job.status || "").toLowerCase();
    return (
      status.includes("interview") ||
      status === "onsite" ||
      status === "phone_screen"
    );
  }).length;

  let statusTrend = "Planning";
  if (offers > 0) statusTrend = "Offer stage";
  else if (interviewsScheduled > 0) statusTrend = "Interviewing";
  else if (totalApplications > 0) statusTrend = "Actively applying";

  let consistencyScore = 0;
  if (applicationsThisWeek >= 10) consistencyScore = 100;
  else if (applicationsThisWeek >= 5) consistencyScore = 80;
  else if (applicationsThisWeek >= 2) consistencyScore = 60;
  else if (applicationsThisWeek >= 1) consistencyScore = 40;

  let upcomingInterview = null;
  const jobsWithInterviewDate = jobs
    .filter((job) => job.nextInterviewDate)
    .map((job) => ({
      ...job,
      nextInterviewDate: new Date(job.nextInterviewDate),
    }))
    .filter((job) => job.nextInterviewDate >= now)
    .sort((a, b) => a.nextInterviewDate - b.nextInterviewDate);

  if (jobsWithInterviewDate.length > 0) {
    const j = jobsWithInterviewDate[0];
    upcomingInterview = {
      company: j.company || j.companyName || null,
      jobTitle: j.jobTitle || j.title || null,
      date: j.nextInterviewDate.toISOString(),
    };
  }

  const sortedByActivity = [...jobs].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0);
    const bDate = new Date(b.updatedAt || b.createdAt || 0);
    return bDate - aDate;
  });

  const recentActivity = sortedByActivity.slice(0, 5).map((job) => {
    const status = (job.status || "").toLowerCase();
    let type = "application";

    if (
      status.includes("interview") ||
      status === "phone_screen" ||
      status === "onsite"
    ) {
      type = "interview";
    } else if (
      status === "offer" ||
      status === "offer_received" ||
      status === "accepted_offer"
    ) {
      type = "offer";
    } else if (
      status === "rejected" ||
      status === "declined" ||
      status === "closed"
    ) {
      type = "update";
    }

    return {
      type,
      title:
        job.jobTitle ||
        job.title ||
        `Update on ${job.company || job.companyName || "a role"}`,
      company: job.company || job.companyName || null,
      status: job.status || null,
      date: (job.updatedAt || job.createdAt || new Date()).toISOString(),
    };
  });

  return {
    progressSummary: {
      totalApplications,
      applicationsThisWeek,
      interviewsScheduled,
      offers,
      statusTrend,
      consistencyScore,
    },
    upcomingInterview,
    recentActivity,
    wellbeing: wellbeingSnapshot || null,
    notes: null, // future hook for reflections
  };
}


/**
 * Take raw summary and apply supporter permissions to hide sensitive details.
 */
function filterSummaryForSupporter(raw, permissions) {
  const result = {
    // Always include progressSummary if they have this permission
    progressSummary: raw.progressSummary,
  };

  // Upcoming interview
  if (raw.upcomingInterview) {
    if (permissions.canSeeInterviewSchedule) {
      result.upcomingInterview = { ...raw.upcomingInterview };
      if (!permissions.canSeeCompanyNames) {
        result.upcomingInterview.company = null;
      }
    } else {
      // Show very generic info, no dates or company
      result.upcomingInterview = {
        message: "An interview is coming up soon.",
      };
    }
  } else {
    result.upcomingInterview = null;
  }

  // Recent activity list
  result.recentActivity = raw.recentActivity.map((item) => {
    const copy = { ...item };

    if (!permissions.canSeeCompanyNames) {
      copy.company = null;
    }

    if (!permissions.canSeeRejections) {
      // If it's clearly a negative outcome, you can decide to hide it
      if (
        (copy.status || "").toLowerCase() === "rejected" ||
        (copy.status || "").toLowerCase() === "declined"
      ) {
        // Replace with something neutral or drop it
        copy.title = "Update on an application";
        copy.status = null;
      }
    }

    // We still keep type/date; you can strip further if you want

    return copy;
  });

  // Wellbeing data
  if (raw.wellbeing && permissions.canSeeWellbeingCheckins) {
    result.wellbeing = raw.wellbeing;
  } else {
    result.wellbeing = null;
  }

  // Notes (weekly reflections)
  if (raw.notes && permissions.canSeeNotes) {
    result.notes = raw.notes;
  } else {
    result.notes = null;
  }

  

  return result;
}


/**
 * Create a wellbeing check-in for user.
 */
export async function createWellbeingCheckin({
  userId,
  stressLevel,
  moodLevel,
  energyLevel,
  note,
}) {
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }

  if (!stressLevel || !moodLevel) {
    const err = new Error("stressLevel and moodLevel are required");
    err.statusCode = 400;
    throw err;
  }

  const checkin = await WellbeingCheckin.create({
    userId,
    stressLevel,
    moodLevel,
    energyLevel,
    note,
  });

  return checkin;
}

/**
 * Get recent check-ins for a user, within the given number of days.
 */
export async function getRecentCheckins({ userId, days = 14 }) {
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const checkins = await WellbeingCheckin.find({
    userId,
    createdAt: { $gte: since, $lte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  return checkins;
}

/**
 * Build a simple wellbeing snapshot + trend for supporter summary.
 * - Looks at last 7 days vs previous 7 days.
 */
export async function getWellbeingSnapshot({ userId }) {
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const fromCurrent = new Date(now.getTime() - sevenDaysMs);
  const fromPrevious = new Date(now.getTime() - 2 * sevenDaysMs);

  // Current window: last 7 days
  const currentCheckins = await WellbeingCheckin.find({
    userId,
    createdAt: { $gte: fromCurrent, $lte: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  // Previous window: 7–14 days ago
  const previousCheckins = await WellbeingCheckin.find({
    userId,
    createdAt: { $gte: fromPrevious, $lt: fromCurrent },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!currentCheckins.length && !previousCheckins.length) {
    return null; // no data yet
  }

  const currentAvgStress = average(currentCheckins.map((c) => c.stressLevel));
  const currentAvgMood = average(currentCheckins.map((c) => c.moodLevel));

  const prevAvgStress = previousCheckins.length
    ? average(previousCheckins.map((c) => c.stressLevel))
    : null;

  const stressLabel = mapStressToLabel(currentAvgStress);
  const moodLabel = mapMoodToLabel(currentAvgMood);
  const trend = computeTrend(currentAvgStress, prevAvgStress);

  const lastCheckin = currentCheckins[0] || previousCheckins[0];

  return {
    stressLevelLabel: stressLabel, // "low" | "moderate" | "high"
    moodLabel,                     // "low" | "okay" | "positive"
    stressScore: currentAvgStress,
    moodScore: currentAvgMood,
    trend,                         // "improving" | "stable" | "worsening" | "unknown"
    lastUpdatedAt: lastCheckin?.createdAt,
  };
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((acc, n) => acc + n, 0) / nums.length;
}

function mapStressToLabel(score) {
  if (!score) return "unknown";
  if (score <= 2) return "low";       // 1–2
  if (score <= 3.5) return "moderate"; // >2–3.5
  return "high";                      // >3.5–5
}

function mapMoodToLabel(score) {
  if (!score) return "unknown";
  if (score <= 2) return "low";
  if (score <= 3.5) return "okay";
  return "positive";
}

function computeTrend(current, previous) {
  if (!previous || !current) return "unknown";

  const diff = previous - current; // higher number = less stressed

  if (Math.abs(diff) < 0.3) return "stable";
  if (diff > 0.3) return "improving";  // stress went down
  return "worsening";                  // stress went up
}

export async function listSupportedPeople({ supporterUserId }) {
  const db = getDb()
  const supporters = await Supporter.find({
    supporterUserId,
    status: "accepted",
  }).lean();

  if (!supporters.length) return [];

  // Get job seeker info to show names/emails
  const ownerIds = [...new Set(supporters.map((s) => s.ownerUserId))];
  const owners =   await db.collection("profiles").find({ userId: { $in: ownerIds } },    { projection: {userId: 1,fullName:1, email:1} })
    
      .toArray();

  const ownerById = new Map(
    owners.map((o) => [o._id.toString(), o])
  );

  return supporters.map((s) => {
    const owner = ownerById.get(s.ownerUserId?.toString());
    return {
      _id: s._id.toString(),
      ownerUserId: s.ownerUserId,
      supporterUserId: s.supporterUserId,
      relationship: s.relationship,
      status: s.status,
      invitedAt: s.invitedAt,
      acceptedAt: s.acceptedAt,
      lastViewedAt: s.lastViewedAt,
      permissions: s.permissions,
      boundaries: s.boundaries,
      jobSeeker: owner
        ? {
            _id: owner.userId.toString(),
            fullName: owner.fullName || "Job seeker",
            email: owner.email,
          }
        : null,
    };
  });
}