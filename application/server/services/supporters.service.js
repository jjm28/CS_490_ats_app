// services/supportersService.js
import crypto from "crypto";
import Supporter from "../models/support/Supporter.js";
import WellbeingCheckin from "../models/support/WellbeingCheckin.js";
import Jobs from "../models/jobs.js";
import { sendSupporterInviteEmail } from "./emailService.js"; 
import { getDb } from "../db/connection.js";
import Milestone from "../models/support/Milestone.js";
import SupportUpdate from "../models/support/SupportUpdate.js";
import WellbeingSettings from "../models/support/WellbeingSettings.js";
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

const EDUCATIONAL_RESOURCES = [
  {
    slug: "support-basics",
    title: "How to support someone during a job search",
    category: "emotional_support",
    description:
      "Overview of what a modern job search looks like, why it takes time, and how to be a steady, encouraging presence.",
    audience: ["general"],
    stages: ["Planning", "Actively applying", "Interviewing", "Offer stage"],
    stress: ["any"],
  },
  {
    slug: "parents-guide",
    title: "Guide for parents & caregivers",
    category: "family",
    description:
      "Explains how to balance concern and encouragement without adding pressure, especially for early-career job seekers.",
    audience: ["parent", "family"],
    stages: ["Planning", "Actively applying", "Interviewing"],
    stress: ["moderate", "high", "any"],
  },
  {
    slug: "partners-guide",
    title: "Guide for partners & close relationships",
    category: "family",
    description:
      "How to support someone you live with or talk to daily, including handling money and future questions gently.",
    audience: ["partner"],
    stages: ["Actively applying", "Interviewing", "Offer stage"],
    stress: ["any"],
  },
  {
    slug: "friends-guide",
    title: "Guide for friends & siblings",
    category: "social",
    description:
      "Ways to check in, hype them up, and include them socially without making everything about the job search.",
    audience: ["friend", "sibling"],
    stages: ["Actively applying", "Interviewing"],
    stress: ["any"],
  },
  {
    slug: "boundaries",
    title: "Healthy boundaries when talking about jobs",
    category: "boundaries",
    description:
      "Explains why boundaries matter and gives examples of what is and isn’t helpful to ask about.",
    audience: ["general"],
    stages: ["Planning", "Actively applying", "Interviewing", "Offer stage"],
    stress: ["any"],
  },
  {
    slug: "interview-support",
    title: "Supporting them through interviews and rejections",
    category: "interviews",
    description:
      "How to help with prep, nerves, and post-interview feelings without demanding every detail.",
    audience: ["general"],
    stages: ["Interviewing"],
    stress: ["moderate", "high"],
  },
  {
    slug: "offer-stage",
    title: "Helping them think through offers & decisions",
    category: "offers",
    description:
      "How to ask good questions and give input on offers without pushing them into a decision.",
    audience: ["general", "parent", "partner"],
    stages: ["Offer stage"],
    stress: ["low", "moderate", "any"],
  },
];

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
const [jobs, wellbeingSnapshot, milestones, updates] = await Promise.all([
  Jobs.find({ userId: ownerUserId }).lean(),
  getWellbeingSnapshot({ userId: ownerUserId }),
  getMilestonesForSupporter({ supporter }),
  getSupportUpdatesForSupporter({ supporter, limit: 5 }),
]);
const rawSummary = buildRawSummary(
  jobs,
  wellbeingSnapshot,
  supporter.boundaries,
  milestones,
  updates,
  supporter.relationship 
);

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
// BEFORE:
// function buildRawSummary(jobs, wellbeingSnapshot) {

// AFTER:
function buildRawSummary(jobs, wellbeingSnapshot, boundaries,milestones,updates,relationship) {
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

  const progressSummary = {
    totalApplications,
    applicationsThisWeek,
    interviewsScheduled,
    offers,
    statusTrend,
    consistencyScore,
  };

  const wellbeing = wellbeingSnapshot || null;

const guidance = buildSupporterGuidance({
  progressSummary,
  wellbeing,
  boundaries,
  relationship
});
  const recentMilestones = milestones || [];
  const supportUpdates = updates || [];
  return {
    progressSummary,
    upcomingInterview,
    recentActivity,
    wellbeing,
    notes: null,
    guidance,
    milestones: recentMilestones,
    updates: supportUpdates,

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
result.guidance = raw.guidance || null;
  

  result.milestones = (raw.milestones || []).map((m) => {
    const copy = { ...m };
    if (!permissions.canSeeCompanyNames) {
      copy.jobCompany = null;
    }
    return copy;
  });
  result.updates = raw.updates || [];
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

function normalizeRelationship(relRaw) {
  const rel = (relRaw || "").toLowerCase();

  if (
    rel.includes("mom") ||
    rel.includes("mother") ||
    rel.includes("dad") ||
    rel.includes("father") ||
    rel.includes("parent") ||
    rel.includes("guardian")
  ) {
    return "parent";
  }
  if (
    rel.includes("partner") ||
    rel.includes("boyfriend") ||
    rel.includes("girlfriend") ||
    rel.includes("spouse") ||
    rel.includes("husband") ||
    rel.includes("wife")
  ) {
    return "partner";
  }
  if (rel.includes("sister") || rel.includes("brother") || rel.includes("sibling")) {
    return "sibling";
  }
  if (rel.includes("friend")) {
    return "friend";
  }
  if (rel.includes("mentor")) {
    return "mentor";
  }

  return "general";
}

function selectEducationalResources({ statusTrend, stressLabel, relationship }) {
  const stage = statusTrend || "Planning";
  const stress = stressLabel || "any";
  const relKey = normalizeRelationship(relationship);

  const candidates = EDUCATIONAL_RESOURCES.filter((r) => {
    const audience = r.audience || ["general"];
    const stages = r.stages || ["Planning", "Actively applying", "Interviewing", "Offer stage"];
    const stressBands = r.stress || ["any"];

    const audienceMatch =
      audience.includes("general") || audience.includes(relKey);

    const stageMatch = stages.includes(stage);

    const stressMatch =
      stressBands.includes("any") ||
      (stress !== "unknown" && stressBands.includes(stress));

    return audienceMatch && stageMatch && stressMatch;
  });

  if (candidates.length > 0) {
    return candidates.slice(0, 3);
  }

  // Fallback: at least show basics + boundaries
  return EDUCATIONAL_RESOURCES.filter((r) =>
    ["support-basics", "boundaries"].includes(r.slug)
  );
}

function buildSupporterGuidance({ progressSummary, wellbeing, boundaries,relationship }) {
  const {
    statusTrend,
    consistencyScore,
  } = progressSummary || {};

  const b = boundaries || {};
  const topicsOffLimits = (b.topicsOffLimits || []).map((t) =>
    t.toLowerCase()
  );
  const avoidRejectionTalk = topicsOffLimits.some((t) =>
    t.includes("rejection")
  );
  const avoidSalaryTalk = topicsOffLimits.some((t) =>
    t.includes("salary")
  );
  const avoidJobTalk = topicsOffLimits.some((t) =>
    t.includes("job")
  );

  const preferredCheckinFrequency = b.preferredCheckinFrequency || "weekly";
  const preferredContactChannel = b.preferredContactChannel || "in_app";

  // --- HEADLINE + SUMMARY ---------------------------------------

  let headline = "Offer gentle encouragement and be a steady presence.";
  let summary = "";

  if (statusTrend === "Planning") {
    headline = "Support them as they plan, not just when they get offers.";
    summary =
      "They may still be clarifying their goals or building their application materials. Encouragement and curiosity can help more than pressure.";
  } else if (statusTrend === "Actively applying") {
    headline = "Focus on cheering their effort, not just results.";
    summary =
      "They’re applying and building momentum. Recognize their work and avoid turning every conversation into a status update.";
  } else if (statusTrend === "Interviewing") {
    headline = "Support them through interview nerves and recovery.";
    summary =
      "They’re handling interviews, which can be stressful and draining. Listening and celebrating effort matters a lot right now.";
  } else if (statusTrend === "Offer stage") {
    headline = "Help them think clearly without adding pressure.";
    summary =
      "They may be weighing options or waiting for final decisions. Offer space to think and ask how you can help instead of pushing for quick decisions.";
  }

  // Consistency tweaks
  if (typeof consistencyScore === "number") {
    if (consistencyScore < 40) {
      summary +=
        " They might appreciate encouragement and practical help, but it’s important not to make them feel behind.";
    } else if (consistencyScore >= 40 && consistencyScore < 70) {
      summary +=
        " They’re putting in steady effort. Acknowledge what they’re already doing and ask what kind of support actually feels helpful.";
    } else if (consistencyScore >= 70) {
      summary +=
        " They’re working consistently; the best support is often emotional—reminding them they’re more than their job search.";
    }
  }

  // Wellbeing-based adjustments
  const tips = [];
  const avoid = [];

  let stressLabel = wellbeing?.stressLevelLabel || "unknown";
  let moodLabel = wellbeing?.moodLabel || "unknown";
  let trend = wellbeing?.trend || "unknown";

  if (stressLabel === "high") {
    tips.push(
      "Check in on how they’re feeling before asking for job updates.",
      "Offer breaks from job talk—invite them to do something relaxing or fun."
    );
    avoid.push(
      "Don’t ask for detailed updates on every application or interview.",
      "Avoid implying they should be doing more right now."
    );
  } else if (stressLabel === "moderate") {
    tips.push(
      "Ask open-ended questions like “How can I support you this week?”",
      "Offer practical help, like doing a mock interview if they want it."
    );
    avoid.push(
      "Avoid comparing their pace to other people’s careers.",
      "Try not to assume they want advice every time they share an update."
    );
  } else if (stressLabel === "low") {
    tips.push(
      "Celebrate their progress and ask what kind of encouragement they like most.",
      "Offer to be a sounding board if they need to think through options."
    );
    avoid.push(
      "Don’t assume everything is easy just because stress looks low.",
      "Avoid dismissing their concerns if they bring them up."
    );
  }

  if (trend === "worsening") {
    tips.push(
      "Let them know it’s okay to rest and take a slower day when they need it.",
      "Gently remind them they’re more than their job search outcomes."
    );
  } else if (trend === "improving") {
    tips.push(
      "Recognize positive steps they’ve taken recently, not just big milestones."
    );
  }

  // Boundaries-based adjustments
  if (preferredCheckinFrequency === "daily") {
    tips.push("Short, supportive daily check-ins can be helpful for them.");
  } else if (preferredCheckinFrequency === "weekly") {
    tips.push(
      "A once-a-week check-in focused on listening rather than questioning can go a long way."
    );
  } else if (preferredCheckinFrequency === "ad_hoc") {
    tips.push(
      "Let them lead when to talk about jobs; focus on being available when they reach out."
    );
    avoid.push(
      "Avoid bringing up job topics unless they signal they’re open to it."
    );
  }

  if (avoidJobTalk) {
    tips.push(
      "They may want to keep job conversations limited. Let them choose when to share updates."
    );
    avoid.push(
      "Avoid bringing up the job search unless they start the conversation."
    );
  }

  if (avoidRejectionTalk) {
    avoid.push(
      "Don’t ask for detailed breakdowns of rejections unless they bring it up themselves."
    );
  }

  if (avoidSalaryTalk) {
    avoid.push("Avoid pushing them to reveal salary numbers or offer details.");
  }

  // Ensure we have at least some default tips/avoid items
  if (tips.length === 0) {
    tips.push(
      "Ask how you can support them instead of assuming what they need.",
      "Celebrate their effort and growth, not just final results."
    );
  }
  if (avoid.length === 0) {
    avoid.push(
      "Avoid constant “any news?” questions.",
      "Don’t compare their progress to friends, siblings, or social media."
    );
  }

  // Resources: pick a couple that match their stage
  const resources = selectEducationalResources({
    statusTrend,
    stressLabel,
    relationship,
  });

  return {
    headline,
    summary,
    supportTips: tips,
    thingsToAvoid: avoid,
    resources,
  };

}

export async function createMilestone({
  ownerUserId,
  type,
  title,
  message,
  jobId,
  visibility,
  supporterIds,
}) {
  if (!ownerUserId) {
    const err = new Error("ownerUserId is required");
    err.statusCode = 400;
    throw err;
  }
  if (!type || !title) {
    const err = new Error("type and title are required");
    err.statusCode = 400;
    throw err;
  }

  let jobCompany = null;
  let jobTitle = null;

  if (jobId) {
    const job = await Jobs.findById(jobId).lean();
    if (job && job.userId?.toString() === ownerUserId.toString()) {
      jobCompany = job.company || job.companyName || null;
      jobTitle = job.jobTitle || job.title || null;
    }
  }

  const doc = await Milestone.create({
    ownerUserId,
    jobId: jobId || null,
    type,
    title,
    message: message || "",
    visibility: visibility === "custom" ? "custom" : "all",
    visibleToSupporterIds:
      visibility === "custom" && Array.isArray(supporterIds)
        ? supporterIds
        : [],
    jobCompany,
    jobTitle,
  });

  return doc;
}

/**
 * Get milestones visible to a given supporter.
 * supporter: Supporter document
 * limit: how many (default 5)
 */
export async function getMilestonesForSupporter({ supporter, limit = 5 }) {
  const ownerUserId = supporter.ownerUserId;
  const supporterId = supporter._id.toString();

  const query = {
    ownerUserId,
    $or: [
      { visibility: "all" },
      { visibility: "custom", visibleToSupporterIds: supporterId },
    ],
  };

  const milestones = await Milestone.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return milestones.map((m) => ({
    id: m._id.toString(),
    type: m.type,
    title: m.title,
    message: m.message,
    createdAt: m.createdAt,
    // include full job snapshot; we'll filter company name later by permissions
    jobId: m.jobId || null,
    jobCompany: m.jobCompany,
    jobTitle: m.jobTitle,
  }));
}

export async function createSupportUpdate({
  ownerUserId,
  type,
  title,
  body,
  toneTag,
  visibility,
  supporterIds,
}) {
  if (!ownerUserId) {
    const err = new Error("ownerUserId is required");
    err.statusCode = 400;
    throw err;
  }
  if (!title || !title.trim() || !body || !body.trim()) {
    const err = new Error("title and body are required");
    err.statusCode = 400;
    throw err;
  }

  const update = await SupportUpdate.create({
    ownerUserId,
    type: type || "OTHER",
    title: title.trim(),
    body: body.trim(),
    toneTag: toneTag || null,
    visibility: visibility === "custom" ? "custom" : "all",
    visibleToSupporterIds:
      visibility === "custom" && Array.isArray(supporterIds)
        ? supporterIds
        : [],
  });

  return update;
}

/**
 * Get updates visible to a specific supporter for a job seeker.
 * `supporter` is the Supporter document (with ownerUserId + _id).
 */
export async function getSupportUpdatesForSupporter({
  supporter,
  limit = 5,
}) {
  const ownerUserId = supporter.ownerUserId;
  const supporterId = supporter._id.toString();

  const query = {
    ownerUserId,
    $or: [
      { visibility: "all" },
      { visibility: "custom", visibleToSupporterIds: supporterId },
    ],
  };

  const updates = await SupportUpdate.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return updates.map((u) => ({
    id: u._id.toString(),
    type: u.type,
    title: u.title,
    body: u.body,
    toneTag: u.toneTag,
    createdAt: u.createdAt,
  }));
}


/**
 * Get the start of the week (Mon 00:00) for a given date in UTC.
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun,...6=Sat
  const diff = (day + 6) % 7; // how many days to go back to Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Build an array of week buckets ending this week, size `weeks`.
 * Each bucket: { start: Date, end: Date }
 */
function buildWeekBuckets(weeks) {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const buckets = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart);
    start.setUTCDate(start.getUTCDate() - i * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    buckets.push({ start, end });
  }

  return buckets;
}

/**
 * Compute a wellbeing & support overview for the user.
 */
export async function getWellbeingSupportOverview({
  userId,
  weeks = 4,
}) {
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }

  const buckets = buildWeekBuckets(weeks);
  const rangeStart = buckets[0].start;
  const now = new Date();

  // Load data for the whole period once
  const [checkins, milestones, updates, jobs, settings] = await Promise.all([
    WellbeingCheckin.find({
      userId,
      createdAt: { $gte: rangeStart },
    }).lean(),
    Milestone.find({
      ownerUserId: userId,
      createdAt: { $gte: rangeStart },
    }).lean(),
    SupportUpdate.find({
      ownerUserId: userId,
      createdAt: { $gte: rangeStart },
    }).lean(),
    Jobs.find({ userId }).lean(),
    WellbeingSettings.findOne({ userId }).lean(),
  ]);

  // Helper to map date -> bucket index
  function findBucketIndex(date) {
    const d = new Date(date);
    for (let i = 0; i < buckets.length; i++) {
      if (d >= buckets[i].start && d < buckets[i].end) return i;
    }
    return -1;
  }

  // Initialize weekly stats
  const weekly = buckets.map((b) => ({
    weekStart: b.start,
    avgStressLevel: null,
    avgMoodLevel: null,
    hasCheckins: false,
    numSupportUpdates: 0,
    numMilestones: 0,
    numApplications: 0,
    numInterviews: 0,
    numOffers: 0,
  }));

  // Aggregate wellbeing
  const stressSums = Array(weeks).fill(0);
  const stressCounts = Array(weeks).fill(0);
  const moodSums = Array(weeks).fill(0);
  const moodCounts = Array(weeks).fill(0);

  checkins.forEach((c) => {
    const idx = findBucketIndex(c.createdAt);
    if (idx === -1) return;
    stressSums[idx] += c.stressLevel || 0;
    stressCounts[idx] += 1;
    moodSums[idx] += c.moodLevel || 0;
    moodCounts[idx] += 1;
  });

  for (let i = 0; i < weeks; i++) {
    if (stressCounts[i] > 0) {
      weekly[i].avgStressLevel = stressSums[i] / stressCounts[i];
      weekly[i].hasCheckins = true;
    }
    if (moodCounts[i] > 0) {
      weekly[i].avgMoodLevel = moodSums[i] / moodCounts[i];
      weekly[i].hasCheckins = true;
    }
  }

  // Aggregate support updates
  updates.forEach((u) => {
    const idx = findBucketIndex(u.createdAt);
    if (idx === -1) return;
    weekly[idx].numSupportUpdates += 1;
  });

  // Aggregate milestones
  milestones.forEach((m) => {
    const idx = findBucketIndex(m.createdAt);
    if (idx === -1) return;
    weekly[idx].numMilestones += 1;
  });

  // Aggregate job activity (rough)
  jobs.forEach((job) => {
    const appliedAt =
      job.appliedAt || job.createdAt || job.updatedAt || null;
    if (appliedAt) {
      const idx = findBucketIndex(appliedAt);
      if (idx !== -1) {
        weekly[idx].numApplications += 1;
      }
    }

    // interviews by nextInterviewDate
    if (job.nextInterviewDate) {
      const idx = findBucketIndex(job.nextInterviewDate);
      if (idx !== -1) {
        weekly[idx].numInterviews += 1;
      }
    }

    const status = (job.status || "").toLowerCase();
    if (
      status === "offer" ||
      status === "offer_received" ||
      status === "accepted_offer"
    ) {
      const idx = findBucketIndex(job.updatedAt || job.createdAt || now);
      if (idx !== -1) {
        weekly[idx].numOffers += 1;
      }
    }
  });

  // Compute simple insight about support vs stress
  let stressWithSupportSum = 0;
  let stressWithSupportCount = 0;
  let stressWithoutSupportSum = 0;
  let stressWithoutSupportCount = 0;

  weekly.forEach((w) => {
    if (w.avgStressLevel == null) return;
    const supportActivity = w.numSupportUpdates + w.numMilestones;

    if (supportActivity > 0) {
      stressWithSupportSum += w.avgStressLevel;
      stressWithSupportCount++;
    } else {
      stressWithoutSupportSum += w.avgStressLevel;
      stressWithoutSupportCount++;
    }
  });

  let simpleInsight = null;

  if (stressWithSupportCount > 0 && stressWithoutSupportCount > 0) {
    const avgWithSupport = stressWithSupportSum / stressWithSupportCount;
    const avgWithoutSupport =
      stressWithoutSupportSum / stressWithoutSupportCount;

    // Lower stressLevel = better, since 1=lowest, 5=highest
    if (avgWithSupport < avgWithoutSupport - 0.2) {
      simpleInsight =
        "In weeks where you shared at least one update or celebration with supporters, your average stress check-ins were a bit lower.";
    } else if (avgWithSupport > avgWithoutSupport + 0.2) {
      simpleInsight =
        "In weeks where you shared updates with supporters, you tended to log slightly higher stress—this might mean you reach out more when weeks are tough.";
    } else {
      simpleInsight =
        "Your stress levels look similar in weeks with and without supporter activity. The most important thing is using support in a way that feels right to you.";
    }
  }

  const currentWeek = weekly[weeks - 1] || null;

  return {
    currentWeek,
    weeklyTrend: weekly,
    simpleInsight,
    resetPlan: settings?.resetPlan || "",
  };
}

/**
 * Upsert the user's reset/coping plan.
 */
export async function saveWellbeingResetPlan({ userId, resetPlan }) {
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }

  const doc = await WellbeingSettings.findOneAndUpdate(
    { userId },
    { $set: { resetPlan: resetPlan || "" } },
    { upsert: true, new: true }
  ).lean();

  return doc;
}