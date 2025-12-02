// services/advisor.service.js
import crypto from "crypto";
import AdvisorRelationship from "../models/Advisor/AdvisorRelationship.js";
import AdvisorProfile from "../models/Advisor/AdvisorProfile.js";
import Profile from "../models/profile.js";
import Jobs from "../models/jobs.js"; // note: using your actual filenames
import AdvisorMessage from "../models/Advisor/AdvisorMessage.js";
import Resume from "../models/resume.js"; // or "../models/Resume.js"
import Coverletter from "../models/coverletters.js"; // adjust to real filename
import Job from "../models/jobs.js";
import JobSearchGoal from "../models/JobSharing/JobSearchGoal.js";
import JobSearchMilestone from "../models/JobSharing/JobSearchMilestone.js";
import JobSearchGoalProgress from "../models/JobSharing/JobSearchGoalProgress.js";
import { sendAdvisorInviteEmail } from "./emailService.js";
import AdvisorRecommendation from "../models/Advisor/AdvisorRecommendation.js";
import AdvisorAvailability from "../models/Advisor/AdvisorAvailability.js";
import AdvisorSession from "../models/Advisor/AdvisorSession.js";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function minutesFromTimeStr(t) {
  // t = "HH:MM"
  const [h, m] = t.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function isWithinWeeklySlot(date, slot) {
  const dayOfWeek = date.getUTCDay(); // 0-6
  if (dayOfWeek !== slot.dayOfWeek) return false;

  const mins = date.getUTCHours() * 60 + date.getUTCMinutes();
  const startMins = minutesFromTimeStr(slot.startTime);
  const endMins = minutesFromTimeStr(slot.endTime);
  return mins >= startMins && mins + 1 <= endMins; // +1 to avoid equal end
}

function sessionsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Create an advisor invite and send email.
 */
export async function createAdvisorInvite({
  ownerUserId,
  advisorName,
  advisorEmail,
  advisorType,
  permissions,
}) {
  if (!ownerUserId || !advisorEmail) {
    throw new Error("ownerUserId and advisorEmail are required");
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = addDays(new Date(), 7); // 7-day expiry

  const relationship = await AdvisorRelationship.create({
    ownerUserId,
    advisorUserId: null,
    advisorName: advisorName || "",
    advisorEmail: advisorEmail.toLowerCase(),
    advisorType: advisorType || "Mentor",
    status: "pending",
    permissions: {
      canViewBasicProfile:
        permissions?.canViewBasicProfile ?? true,
      canViewJobSummary:
        permissions?.canViewJobSummary ?? true,
      canViewDocumentsSummary:
        permissions?.canViewDocumentsSummary ?? false,
    },
    inviteToken,
    inviteExpiresAt,
  });

  // Get candidate name for email
  const candidateProfile = await Profile.findOne({
    userId: ownerUserId,
  }).lean();

  const jobSeekerName =
    candidateProfile?.fullName || "A job seeker";

  await sendAdvisorInviteEmail({
    toEmail: advisorEmail,
    advisorName,
    jobSeekerName,
    inviteToken,
  });

  // Return without inviteToken
  const { inviteToken: _ignored, ...safeRelationship } =
    relationship.toObject();
  return safeRelationship;
}

/**
 * Accept advisor invite by token and link it to advisorUserId.
 * advisorProfileInput can contain headline, specialties, isPaidCoach, timezone.
 */
export async function respondToAdvisorInviteByToken({
  inviteToken,
  advisorUserId,
  advisorProfileInput,
}) {
  if (!inviteToken || !advisorUserId) {
    throw new Error("inviteToken and advisorUserId are required");
  }

  const now = new Date();

  const relationship = await AdvisorRelationship.findOne({
    inviteToken,
    status: "pending",
    inviteExpiresAt: { $gt: now },
  });

  if (!relationship) {
    const err = new Error("Invalid or expired advisor invite token");
    err.statusCode = 400;
    throw err;
  }

  // Upsert AdvisorProfile
  const profileUpdate = {
    headline: advisorProfileInput?.headline || "",
    specialties: advisorProfileInput?.specialties || [],
    isPaidCoach: !!advisorProfileInput?.isPaidCoach,
    timezone: advisorProfileInput?.timezone || "",
  };

  await AdvisorProfile.findOneAndUpdate(
    { userId: String(advisorUserId) },
    { userId: String(advisorUserId), ...profileUpdate },
    { upsert: true, new: true }
  );

  relationship.advisorUserId = String(advisorUserId);
  relationship.status = "active";

  await relationship.save();

  // Get candidate profile for convenience
  const candidateProfile = await Profile.findOne({
    userId: relationship.ownerUserId,
  }).lean();

  return {
    relationshipId: relationship._id.toString(),
    ownerUserId: relationship.ownerUserId,
    candidate: {
      fullName: candidateProfile?.fullName || null,
      headline: candidateProfile?.headline || null,
    },
  };
}

/**
 * List advisors for a candidate (ownerUserId).
 */
export async function listAdvisorsForOwner(ownerUserId) {
  const relationships = await AdvisorRelationship.find({
    ownerUserId: String(ownerUserId),
  })
    .sort({ createdAt: -1 })
    .lean();

  const advisorUserIds = relationships
    .map((r) => r.advisorUserId)
    .filter(Boolean);

  let advisorProfilesByUserId = {};
  if (advisorUserIds.length) {
    const profiles = await AdvisorProfile.find({
      userId: { $in: advisorUserIds },
    }).lean();
    advisorProfilesByUserId = profiles.reduce((acc, p) => {
      acc[p.userId] = p;
      return acc;
    }, {});
  }

  return relationships.map((r) => {
    const profile = r.advisorUserId
      ? advisorProfilesByUserId[r.advisorUserId]
      : null;

    return {
      id: r._id.toString(),
      ownerUserId: r.ownerUserId,
      advisorUserId: r.advisorUserId,
      advisorName: r.advisorName || r.advisorEmail,
      advisorEmail: r.advisorEmail,
      advisorType: r.advisorType,
      status: r.status,
      permissions: r.permissions,
      advisorProfile: profile
        ? {
            headline: profile.headline,
            specialties: profile.specialties,
            isPaidCoach: profile.isPaidCoach,
          }
        : null,
      createdAt: r.createdAt,
    };
  });
}

/**
 * List clients for an advisor (Advisor Portal).
 */
export async function listClientsForAdvisor(advisorUserId) {
  const relationships = await AdvisorRelationship.find({
    advisorUserId: String(advisorUserId),
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();

  const ownerUserIds = relationships.map((r) => r.ownerUserId);

  const profiles = await Profile.find({
    userId: { $in: ownerUserIds },
  }).lean();

  const profileByUserId = profiles.reduce((acc, p) => {
    acc[p.userId] = p;
    return acc;
  }, {});

  return relationships.map((r) => {
    const candidateProfile = profileByUserId[r.ownerUserId];
    return {
      relationshipId: r._id.toString(),
      ownerUserId: r.ownerUserId,
      candidate: {
        fullName: candidateProfile?.fullName || null,
        headline: candidateProfile?.headline || null,
        industry: candidateProfile?.industry || null,
        experienceLevel: candidateProfile?.experienceLevel || null,
      },
      permissions: r.permissions,
      advisorType: r.advisorType,
      status: r.status,
      createdAt: r.createdAt,
    };
  });
}

/**
 * Get a single client profile for the advisor, respecting permissions.
 */
export async function getAdvisorClientProfile({
  relationshipId,
  advisorUserId,
}) {
  const relationship = await AdvisorRelationship.findById(relationshipId).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.advisorUserId !== String(advisorUserId)) {
    const err = new Error("You do not have access to this client");
    err.statusCode = 403;
    throw err;
  }

  if (relationship.status !== "active") {
    const err = new Error("Advisor relationship is not active");
    err.statusCode = 403;
    throw err;
  }

  const { ownerUserId, permissions } = relationship;

  // Load candidate profile
  const candidateProfile = await Profile.findOne({
    userId: ownerUserId,
  }).lean();

  // Load jobs for summary if allowed
  let jobSummary = null;
  if (permissions?.canViewJobSummary) {
    const jobs = await Jobs.find({
      userId: ownerUserId,
      archived: { $ne: true },
    })
      .select("jobTitle company status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const statusCounts = {
      interested: 0,
      applied: 0,
      phone_screen: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    jobs.forEach((job) => {
      if (statusCounts.hasOwnProperty(job.status)) {
        statusCounts[job.status] += 1;
      }
    });

    const topJobs = jobs.slice(0, 10).map((j) => ({
      id: j._id.toString(),
      jobTitle: j.jobTitle,
      company: j.company,
      status: j.status,
    }));

    jobSummary = {
      totalJobs: jobs.length,
      statusCounts,
      topJobs,
    };
  }

  const basicProfile = permissions?.canViewBasicProfile
    ? {
        fullName: candidateProfile?.fullName || null,
        headline: candidateProfile?.headline || null,
        bio: candidateProfile?.bio || null,
        industry: candidateProfile?.industry || null,
        experienceLevel: candidateProfile?.experienceLevel || null,
        location: candidateProfile?.location || null,
      }
    : null;

  const documentsSummary = permissions?.canViewDocumentsSummary
    ? {
        // TODO: Wire real counts when we implement share-materials requirement
        resumeCount: null,
        coverLetterCount: null,
      }
    : null;

  return {
    relationshipId: relationship._id.toString(),
    ownerUserId,
    advisorUserId: relationship.advisorUserId,
    advisorType: relationship.advisorType,
    permissions: relationship.permissions,
    basicProfile,
    jobSummary,
    documentsSummary,
  };
}

/**
 * Update advisor permissions (candidate side).
 */
export async function updateAdvisorPermissions({
  ownerUserId,
  relationshipId,
  permissions,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  );

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.ownerUserId !== String(ownerUserId)) {
    const err = new Error(
      "You do not have permission to modify this advisor"
    );
    err.statusCode = 403;
    throw err;
  }

  relationship.permissions = {
    canViewBasicProfile:
      permissions?.canViewBasicProfile ?? relationship.permissions.canViewBasicProfile,
    canViewJobSummary:
      permissions?.canViewJobSummary ?? relationship.permissions.canViewJobSummary,
    canViewDocumentsSummary:
      permissions?.canViewDocumentsSummary ??
      relationship.permissions.canViewDocumentsSummary,
  };

  await relationship.save();

  return relationship.toObject();
}

/**
 * Update advisor metadata (name / type) (candidate side).
 */
export async function updateAdvisorMetadata({
  ownerUserId,
  relationshipId,
  advisorName,
  advisorType,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  );

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.ownerUserId !== String(ownerUserId)) {
    const err = new Error(
      "You do not have permission to modify this advisor"
    );
    err.statusCode = 403;
    throw err;
  }

  if (advisorName !== undefined) {
    relationship.advisorName = advisorName;
  }

  if (advisorType !== undefined) {
    relationship.advisorType = advisorType;
  }

  await relationship.save();

  return relationship.toObject();
}

/**
 * Revoke advisor access (candidate side).
 */
export async function revokeAdvisor({
  ownerUserId,
  relationshipId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  );

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.ownerUserId !== String(ownerUserId)) {
    const err = new Error(
      "You do not have permission to revoke this advisor"
    );
    err.statusCode = 403;
    throw err;
  }

  relationship.status = "revoked";
  relationship.advisorUserId = null;

  await relationship.save();

  return relationship.toObject();
}

/**
 * Delete advisor relationship (only allowed for pending invites).
 */
export async function deleteAdvisorRelationship({
  ownerUserId,
  relationshipId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  );

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.ownerUserId !== String(ownerUserId)) {
    const err = new Error(
      "You do not have permission to delete this advisor"
    );
    err.statusCode = 403;
    throw err;
  }

  if (relationship.status !== "pending") {
    const err = new Error(
      "Only pending invites can be deleted. Revoke access instead."
    );
    err.statusCode = 400;
    throw err;
  }

  await AdvisorRelationship.deleteOne({ _id: relationshipId });

  return { deleted: true };
}



/**
 * List messages for an advisor relationship, with access control.
 */
export async function listAdvisorMessages({
  relationshipId,
  role,
  userId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  // Access control
  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error(
        "You do not have access to this conversation"
      );
      err.statusCode = 403;
      throw err;
    }
  } else if (role === "advisor") {
    if (
      relationship.advisorUserId !== String(userId) ||
      relationship.status !== "active"
    ) {
      const err = new Error(
        "You do not have access to this conversation"
      );
      err.statusCode = 403;
      throw err;
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  const messages = await AdvisorMessage.find({
    relationshipId: relationship._id,
  })
    .sort({ createdAt: 1 })
    .lean();

  // Mark as read for this side (basic behavior)
  if (role === "candidate") {
    await AdvisorMessage.updateMany(
      {
        relationshipId: relationship._id,
        isReadByCandidate: false,
      },
      { $set: { isReadByCandidate: true } }
    );
  } else if (role === "advisor") {
    await AdvisorMessage.updateMany(
      {
        relationshipId: relationship._id,
        isReadByAdvisor: false,
      },
      { $set: { isReadByAdvisor: true } }
    );
  }

  return messages.map((m) => ({
    id: m._id.toString(),
    relationshipId: m.relationshipId.toString(),
    ownerUserId: m.ownerUserId,
    advisorUserId: m.advisorUserId,
    senderRole: m.senderRole,
    senderUserId: m.senderUserId,
    body: m.body,
    isReadByCandidate: m.isReadByCandidate,
    isReadByAdvisor: m.isReadByAdvisor,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}

/**
 * Create a new message in an advisor relationship.
 */
export async function createAdvisorMessage({
  relationshipId,
  role,
  userId,
  body,
}) {
  const trimmed = (body || "").trim();
  if (!trimmed) {
    const err = new Error("Message body cannot be empty");
    err.statusCode = 400;
    throw err;
  }

  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  // Access control
  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error(
        "You do not have access to this conversation"
      );
      err.statusCode = 403;
      throw err;
    }
  } else if (role === "advisor") {
    if (
      relationship.advisorUserId !== String(userId) ||
      relationship.status !== "active"
    ) {
      const err = new Error(
        "You do not have access to this conversation"
      );
      err.statusCode = 403;
      throw err;
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  const isCandidate = role === "candidate";

  const message = await AdvisorMessage.create({
    relationshipId: relationship._id,
    ownerUserId: relationship.ownerUserId,
    advisorUserId: relationship.advisorUserId || "",

    senderRole: role,
    senderUserId: String(userId),
    body: trimmed,

    isReadByCandidate: isCandidate,
    isReadByAdvisor: !isCandidate,
  });

  return {
    id: message._id.toString(),
    relationshipId: message.relationshipId.toString(),
    ownerUserId: message.ownerUserId,
    advisorUserId: message.advisorUserId,
    senderRole: message.senderRole,
    senderUserId: message.senderUserId,
    body: message.body,
    isReadByCandidate: message.isReadByCandidate,
    isReadByAdvisor: message.isReadByAdvisor,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function filterIdsByOwner({
  model,
  ids,
  ownerUserId,
  ownerField = "userId",
}) {
  if (!ids || ids.length === 0) return [];

  const docs = await model
    .find({
      _id: { $in: ids },
      [ownerField]: String(ownerUserId),
    })
    .select("_id")
    .lean();

  return docs.map((d) => d._id.toString());
}

export async function getAdvisorSharingConfig({
  ownerUserId,
  relationshipId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.ownerUserId !== String(ownerUserId)) {
    const err = new Error(
      "You do not have permission to view this sharing config"
    );
    err.statusCode = 403;
    throw err;
  }

  // Load available options for this user
  const [resumes, coverLetters, jobs] = await Promise.all([
    Resume.find({ owner: ownerUserId, archived: { $ne: true } })
      .select("_id filename templateKey updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),
    Coverletter.find({ owner: ownerUserId })
      .select("_id filename templateKey updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),
    Job.find({ userId: ownerUserId, archived: { $ne: true } })
      .select("_id jobTitle company status updatedAt")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  return {
    config: {
      sharedResumeIds: relationship.sharedResumeIds || [],
      sharedCoverLetterIds:
        relationship.sharedCoverLetterIds || [],
      sharedJobIds: relationship.sharedJobIds || [],
      shareProgressSummary:
        relationship.shareProgressSummary || false,
    },
    options: {
      resumes: resumes.map((r) => ({
        id: r._id.toString(),
        filename: r.filename,
        templateKey: r.templateKey,
        updatedAt: r.updatedAt,
      })),
      coverLetters: coverLetters.map((c) => ({
        id: c._id.toString(),
        filename: c.filename,
        templateKey: c.templateKey,
        updatedAt: c.updatedAt,
      })),
      jobs: jobs.map((j) => ({
        id: j._id.toString(),
        jobTitle: j.jobTitle,
        company: j.company,
        status: j.status,
        updatedAt: j.updatedAt,
      })),
    },
  };
}
export async function updateAdvisorSharingConfig({
  ownerUserId,
  relationshipId,
  sharedResumeIds,
  sharedCoverLetterIds,
  sharedJobIds,
  shareProgressSummary,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  );

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.ownerUserId !== String(ownerUserId)) {
    const err = new Error(
      "You do not have permission to update this sharing config"
    );
    err.statusCode = 403;
    throw err;
  }

  // Normalize arrays
  const resumeIds = Array.isArray(sharedResumeIds)
    ? [...new Set(sharedResumeIds.map(String))]
    : [];
  const coverLetterIds = Array.isArray(sharedCoverLetterIds)
    ? [...new Set(sharedCoverLetterIds.map(String))]
    : [];
  const jobIds = Array.isArray(sharedJobIds)
    ? [...new Set(sharedJobIds.map(String))]
    : [];

  // Filter by ownership to avoid sharing someone else's docs
  const [safeResumeIds, safeCoverLetterIds, safeJobIds] =
    await Promise.all([
      filterIdsByOwner({
        model: Resume,
        ids: resumeIds,
        ownerUserId,
        ownerField: "owner",
      }),
      filterIdsByOwner({
        model: Coverletter,
        ids: coverLetterIds,
        ownerUserId,
        ownerField: "owner",
      }),
      filterIdsByOwner({
        model: Job,
        ids: jobIds,
        ownerUserId,
        ownerField: "userId",
      }),
    ]);

  relationship.sharedResumeIds = safeResumeIds;
  relationship.sharedCoverLetterIds = safeCoverLetterIds;
  relationship.sharedJobIds = safeJobIds;

  if (typeof shareProgressSummary === "boolean") {
    relationship.shareProgressSummary = shareProgressSummary;
  }

  await relationship.save();

  return {
    sharedResumeIds: relationship.sharedResumeIds,
    sharedCoverLetterIds: relationship.sharedCoverLetterIds,
    sharedJobIds: relationship.sharedJobIds,
    shareProgressSummary: relationship.shareProgressSummary,
  };
}

export async function getAdvisorClientMaterials({
  relationshipId,
  advisorUserId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (relationship.advisorUserId !== String(advisorUserId)) {
    const err = new Error(
      "You do not have access to this client"
    );
    err.statusCode = 403;
    throw err;
  }

  if (relationship.status !== "active") {
    const err = new Error(
      "Advisor relationship is not active"
    );
    err.statusCode = 403;
    throw err;
  }

  const { ownerUserId, permissions } = relationship;

  // Documents
  let documents = null;

  if (permissions?.canViewDocumentsSummary) {
    const [resumes, coverLetters] = await Promise.all([
      Resume.find({
        _id: { $in: relationship.sharedResumeIds || [] },
        owner: ownerUserId,
      })
        .select("_id filename templateKey updatedAt")
        .lean(),
      Coverletter.find({
        _id: { $in: relationship.sharedCoverLetterIds || [] },
        owner: ownerUserId,
      })
        .select("_id filename templateKey updatedAt")
        .lean(),
    ]);

    documents = {
      resumes: resumes.map((r) => ({
        id: r._id.toString(),
        filename: r.filename,
        templateKey: r.templateKey,
        updatedAt: r.updatedAt,
      })),
      coverLetters: coverLetters.map((c) => ({
        id: c._id.toString(),
        filename: c.filename,
        templateKey: c.templateKey,
        updatedAt: c.updatedAt,
      })),
    };
  }

  // Applications & Progress
  let applications = null;
  let progress = null;

  if (permissions?.canViewJobSummary) {
    const sharedJobIds = relationship.sharedJobIds || [];

    const jobs = await Job.find({
      _id: { $in: sharedJobIds },
      userId: ownerUserId,
    })
      .select(
        "_id jobTitle company status updatedAt applicationDeadline createdAt"
      )
      .lean();

    applications = {
      jobs: jobs.map((j) => ({
        id: j._id.toString(),
        jobTitle: j.jobTitle,
        company: j.company,
        status: j.status,
        updatedAt: j.updatedAt,
        applicationDeadline: j.applicationDeadline,
        createdAt: j.createdAt,
      })),
    };

    if (relationship.shareProgressSummary) {
      // Status counts from shared jobs only
      const statusCounts = {
        interested: 0,
        applied: 0,
        phone_screen: 0,
        interview: 0,
        offer: 0,
        rejected: 0,
      };

      jobs.forEach((j) => {
        if (statusCounts.hasOwnProperty(j.status)) {
          statusCounts[j.status] += 1;
        }
      });

      // Reuse job-sharing models for goals & milestones
      const [goals, milestones] = await Promise.all([
        JobSearchGoal.find({ ownerUserId })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        JobSearchMilestone.find({ ownerUserId })
          .sort({ achievedAt: -1, createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

      progress = {
        enabled: true,
        jobStatusCounts: statusCounts,
        recentGoals: goals.map((g) => ({
          id: g._id.toString(),
          title: g.title || g.name,
          createdAt: g.createdAt,
          targetDate: g.targetDate,
          status: g.status,
        })),
        recentMilestones: milestones.map((m) => ({
          id: m._id.toString(),
          title: m.title,
          description: m.description || "",
          achievedAt: m.achievedAt || m.createdAt,
        })),
      };
    } else {
      progress = { enabled: false };
    }
  }

  return {
    documents,
    applications,
    progress,
  };
}


export async function listAdvisorRecommendations({
  relationshipId,
  role,
  userId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error("You do not have access to this client");
      err.statusCode = 403;
      throw err;
    }
  } else if (role === "advisor") {
    if (
      relationship.advisorUserId !== String(userId) ||
      relationship.status !== "active"
    ) {
      const err = new Error("You do not have access to this client");
      err.statusCode = 403;
      throw err;
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  const recs = await AdvisorRecommendation.find({
    relationshipId: relationship._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  return recs.map((r) => ({
    id: r._id.toString(),
    relationshipId: r.relationshipId.toString(),
    ownerUserId: r.ownerUserId,
    advisorUserId: r.advisorUserId,
    title: r.title,
    description: r.description,
    category: r.category,
    jobId: r.jobId,
    resumeId: r.resumeId,
    coverLetterId: r.coverLetterId,
    status: r.status,
    createdBy: r.createdBy,
    candidateNote: r.candidateNote,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function createAdvisorRecommendation({
  relationshipId,
  advisorUserId,
  title,
  description,
  category,
  jobId,
  resumeId,
  coverLetterId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  );

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (
    relationship.advisorUserId !== String(advisorUserId) ||
    relationship.status !== "active"
  ) {
    const err = new Error("You do not have access to this client");
    err.statusCode = 403;
    throw err;
  }

  const ownerUserId = relationship.ownerUserId;

  const trimmedTitle = (title || "").trim();
  if (!trimmedTitle) {
    const err = new Error("Recommendation title is required");
    err.statusCode = 400;
    throw err;
  }

  const allowedCategories = [
    "resume",
    "cover_letter",
    "job",
    "interview",
    "general",
  ];
  const finalCategory = allowedCategories.includes(category)
    ? category
    : "general";

  // Validate linked entities if provided, and ensure they are also shared
  let finalJobId = null;
  let finalResumeId = null;
  let finalCoverLetterId = null;

  if (finalCategory === "job" && jobId) {
    const asString = String(jobId);
    if (
      !(relationship.sharedJobIds || []).includes(asString)
    ) {
      const err = new Error(
        "Job is not shared with this advisor"
      );
      err.statusCode = 400;
      throw err;
    }
    // Double-check ownership
    const job = await Job.findOne({
      _id: asString,
      userId: ownerUserId,
    }).select("_id");
    if (!job) {
      const err = new Error(
        "Invalid job for this recommendation"
      );
      err.statusCode = 400;
      throw err;
    }
    finalJobId = asString;
  }

  if (finalCategory === "resume" && resumeId) {
    const asString = String(resumeId);
    if (
      !(relationship.sharedResumeIds || []).includes(asString)
    ) {
      const err = new Error(
        "Resume is not shared with this advisor"
      );
      err.statusCode = 400;
      throw err;
    }
    const resume = await Resume.findOne({
      _id: asString,
      owner: ownerUserId,
    }).select("_id");
    if (!resume) {
      const err = new Error(
        "Invalid resume for this recommendation"
      );
      err.statusCode = 400;
      throw err;
    }
    finalResumeId = asString;
  }

  if (finalCategory === "cover_letter" && coverLetterId) {
    const asString = String(coverLetterId);
    if (
      !(relationship.sharedCoverLetterIds || []).includes(
        asString
      )
    ) {
      const err = new Error(
        "Cover letter is not shared with this advisor"
      );
      err.statusCode = 400;
      throw err;
    }
    const cl = await Coverletter.findOne({
      _id: asString,
      owner: ownerUserId,
    }).select("_id");
    if (!cl) {
      const err = new Error(
        "Invalid cover letter for this recommendation"
      );
      err.statusCode = 400;
      throw err;
    }
    finalCoverLetterId = asString;
  }

  const rec = await AdvisorRecommendation.create({
    relationshipId: relationship._id,
    ownerUserId,
    advisorUserId: relationship.advisorUserId,
    title: trimmedTitle,
    description: (description || "").trim(),
    category: finalCategory,
    jobId: finalJobId,
    resumeId: finalResumeId,
    coverLetterId: finalCoverLetterId,
    status: "pending",
    createdBy: "advisor",
  });

  return {
    id: rec._id.toString(),
    relationshipId: rec.relationshipId.toString(),
    ownerUserId: rec.ownerUserId,
    advisorUserId: rec.advisorUserId,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    jobId: rec.jobId,
    resumeId: rec.resumeId,
    coverLetterId: rec.coverLetterId,
    status: rec.status,
    createdBy: rec.createdBy,
    candidateNote: rec.candidateNote,
    completedAt: rec.completedAt,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

export async function updateAdvisorRecommendation({
  recommendationId,
  role,
  userId,
  fields,
}) {
  const rec = await AdvisorRecommendation.findById(
    recommendationId
  );
  if (!rec) {
    const err = new Error("Recommendation not found");
    err.statusCode = 404;
    throw err;
  }

  const relationship = await AdvisorRelationship.findById(
    rec.relationshipId
  );
  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error(
        "You do not have access to this recommendation"
      );
      err.statusCode = 403;
      throw err;
    }

    // Candidate can update status + candidateNote
    if (fields.status) {
      const allowedStatuses = [
        "pending",
        "in_progress",
        "completed",
        "declined",
      ];
      if (!allowedStatuses.includes(fields.status)) {
        const err = new Error("Invalid status");
        err.statusCode = 400;
        throw err;
      }

      const prevStatus = rec.status;
      rec.status = fields.status;

      if (
        fields.status === "completed" &&
        (!rec.completedAt || prevStatus !== "completed")
      ) {
        rec.completedAt = new Date();
      } else if (fields.status !== "completed") {
        // If they move away from completed, we can keep completedAt
        // or clear it; I'll keep it to preserve history.
      }
    }

    if (typeof fields.candidateNote === "string") {
      rec.candidateNote = fields.candidateNote.slice(0, 1000);
    }
  } else if (role === "advisor") {
    if (
      relationship.advisorUserId !== String(userId) ||
      relationship.status !== "active"
    ) {
      const err = new Error(
        "You do not have access to this recommendation"
      );
      err.statusCode = 403;
      throw err;
    }

    // Advisor can update core content + category/links; they shouldn't overwrite candidate note.
    if (typeof fields.title === "string") {
      const trimmedTitle = fields.title.trim();
      if (!trimmedTitle) {
        const err = new Error("Title cannot be empty");
        err.statusCode = 400;
        throw err;
      }
      rec.title = trimmedTitle;
    }

    if (typeof fields.description === "string") {
      rec.description = fields.description.trim();
    }

    if (fields.category) {
      const allowedCategories = [
        "resume",
        "cover_letter",
        "job",
        "interview",
        "general",
      ];
      if (!allowedCategories.includes(fields.category)) {
        const err = new Error("Invalid category");
        err.statusCode = 400;
        throw err;
      }
      rec.category = fields.category;
      // Reset links when category changes
      rec.jobId = null;
      rec.resumeId = null;
      rec.coverLetterId = null;
    }

    // Handle entity linking updates, same checks as create
    const ownerUserId = relationship.ownerUserId;

    if (fields.jobId !== undefined) {
      if (!fields.jobId) {
        rec.jobId = null;
      } else {
        const asString = String(fields.jobId);
        if (
          !(relationship.sharedJobIds || []).includes(
            asString
          )
        ) {
          const err = new Error(
            "Job is not shared with this advisor"
          );
          err.statusCode = 400;
          throw err;
        }
        const job = await Job.findOne({
          _id: asString,
          userId: ownerUserId,
        }).select("_id");
        if (!job) {
          const err = new Error(
            "Invalid job for this recommendation"
          );
          err.statusCode = 400;
          throw err;
        }
        rec.jobId = asString;
      }
    }

    if (fields.resumeId !== undefined) {
      if (!fields.resumeId) {
        rec.resumeId = null;
      } else {
        const asString = String(fields.resumeId);
        if (
          !(relationship.sharedResumeIds || []).includes(
            asString
          )
        ) {
          const err = new Error(
            "Resume is not shared with this advisor"
          );
          err.statusCode = 400;
          throw err;
        }
        const resume = await Resume.findOne({
          _id: asString,
          owner: ownerUserId,
        }).select("_id");
        if (!resume) {
          const err = new Error(
            "Invalid resume for this recommendation"
          );
          err.statusCode = 400;
          throw err;
        }
        rec.resumeId = asString;
      }
    }

    if (fields.coverLetterId !== undefined) {
      if (!fields.coverLetterId) {
        rec.coverLetterId = null;
      } else {
        const asString = String(fields.coverLetterId);
        if (
          !(relationship.sharedCoverLetterIds || []).includes(
            asString
          )
        ) {
          const err = new Error(
            "Cover letter is not shared with this advisor"
          );
          err.statusCode = 400;
          throw err;
        }
        const cl = await Coverletter.findOne({
          _id: asString,
          owner: ownerUserId,
        }).select("_id");
        if (!cl) {
          const err = new Error(
            "Invalid cover letter for this recommendation"
          );
          err.statusCode = 400;
          throw err;
        }
        rec.coverLetterId = asString;
      }
    }

    // Optional: Advisor sets status to 'declined' to close it
    if (fields.status) {
      const allowedStatuses = [
        "pending",
        "in_progress",
        "completed",
        "declined",
      ];
      if (!allowedStatuses.includes(fields.status)) {
        const err = new Error("Invalid status");
        err.statusCode = 400;
        throw err;
      }
      rec.status = fields.status;
      if (fields.status === "completed" && !rec.completedAt) {
        rec.completedAt = new Date();
      }
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  await rec.save();

  return {
    id: rec._id.toString(),
    relationshipId: rec.relationshipId.toString(),
    ownerUserId: rec.ownerUserId,
    advisorUserId: rec.advisorUserId,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    jobId: rec.jobId,
    resumeId: rec.resumeId,
    coverLetterId: rec.coverLetterId,
    status: rec.status,
    createdBy: rec.createdBy,
    candidateNote: rec.candidateNote,
    completedAt: rec.completedAt,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}
export async function getAdvisorAvailability(advisorUserId) {
  let availability = await AdvisorAvailability.findOne({
    advisorUserId,
  }).lean();

  if (!availability) {
    // lazy default: no slots
    availability = {
      advisorUserId,
      weeklySlots: [],
      sessionTypes: [],
      timezone: "America/New_York",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return availability;
}

export async function upsertAdvisorAvailability({
  advisorUserId,
  weeklySlots,
  sessionTypes,
  timezone,
}) {
  const normalizedSlots = Array.isArray(weeklySlots)
    ? weeklySlots
        .map((s) => ({
          dayOfWeek: Number(s.dayOfWeek),
          startTime: String(s.startTime),
          endTime: String(s.endTime),
        }))
        .filter(
          (s) =>
            !Number.isNaN(s.dayOfWeek) &&
            s.startTime &&
            s.endTime &&
            minutesFromTimeStr(s.endTime) >
              minutesFromTimeStr(s.startTime)
        )
    : [];

  const normalizedTypes = Array.isArray(sessionTypes)
    ? [...new Set(sessionTypes.map((t) => String(t).trim()))].filter(
        (t) => t.length > 0
      )
    : [];

  const doc = await AdvisorAvailability.findOneAndUpdate(
    { advisorUserId },
    {
      advisorUserId,
      weeklySlots: normalizedSlots,
      sessionTypes: normalizedTypes,
      timezone: timezone || "America/New_York",
    },
    { upsert: true, new: true }
  ).lean();

  return doc;
}
export async function generateUpcomingSlots({
  advisorUserId,
  daysAhead = 14,
}) {
  const availability = await AdvisorAvailability.findOne({
    advisorUserId,
  }).lean();

  if (!availability || !availability.weeklySlots.length) {
    return [];
  }

  const now = new Date();
  const endDate = new Date(
    now.getTime() + daysAhead * 24 * 60 * 60 * 1000
  );

  const slots = [];

  // Load existing sessions to avoid conflicts
  const sessions = await AdvisorSession.find({
    advisorUserId,
    status: { $in: ["requested", "confirmed"] },
    startTime: { $lt: endDate },
    endTime: { $gt: now },
  })
    .select("startTime endTime status")
    .lean();

  for (
    let d = new Date(now);
    d <= endDate;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const dayOfWeek = d.getUTCDay();

    const daySlots =
      availability.weeklySlots.filter(
        (s) => s.dayOfWeek === dayOfWeek
      ) || [];

    for (const ws of daySlots) {
      const startMins = minutesFromTimeStr(ws.startTime);
      const endMins = minutesFromTimeStr(ws.endTime);

      for (
        let m = startMins;
        m + 30 <= endMins;
        m += 30
      ) {
        const slotStart = new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            Math.floor(m / 60),
            m % 60,
            0,
            0
          )
        );
        const slotEnd = new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            Math.floor((m + 30) / 60),
            (m + 30) % 60,
            0,
            0
          )
        );

        if (slotEnd <= now) continue;

        const overlaps = sessions.some((s) =>
          sessionsOverlap(
            slotStart,
            slotEnd,
            s.startTime,
            s.endTime
          )
        );

        if (!overlaps) {
          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
          });
        }
      }
    }
  }

  return slots;
}
export async function listAdvisorSessions({
  relationshipId,
  role,
  userId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error("You do not have access");
      err.statusCode = 403;
      throw err;
    }
  } else if (role === "advisor") {
    if (
      relationship.advisorUserId !== String(userId) ||
      relationship.status !== "active"
    ) {
      const err = new Error("You do not have access");
      err.statusCode = 403;
      throw err;
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  const sessions = await AdvisorSession.find({
    relationshipId: relationship._id,
  })
    .sort({ startTime: 1 })
    .lean();

  return sessions.map((s) => (mapAdvisorSession(s)));
}
export async function bookAdvisorSession({
  relationshipId,
  role,
  createdByUserId,
  ownerUserId,
  advisorUserId,
  startTime,
  endTime,
  sessionType,
  note,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  ).lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (
    relationship.ownerUserId !== String(ownerUserId) ||
    relationship.advisorUserId !== String(advisorUserId)
  ) {
    const err = new Error("User IDs do not match relationship");
    err.statusCode = 400;
    throw err;
  }

  if (relationship.status !== "active") {
    const err = new Error("Advisor relationship is not active");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (!(start instanceof Date) || !(end instanceof Date)) {
    const err = new Error("Invalid start/end time");
    err.statusCode = 400;
    throw err;
  }

  if (end <= start) {
    const err = new Error("End time must be after start time");
    err.statusCode = 400;
    throw err;
  }

  if (start <= now) {
    const err = new Error("Session must be in the future");
    err.statusCode = 400;
    throw err;
  }

  // Role + identity checks
  if (role === "candidate") {
    if (relationship.ownerUserId !== String(createdByUserId)) {
      const err = new Error("You cannot book for this client");
      err.statusCode = 403;
      throw err;
    }
  } else if (role === "advisor") {
    if (relationship.advisorUserId !== String(createdByUserId)) {
      const err = new Error("You cannot book for this client");
      err.statusCode = 403;
      throw err;
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  // Check it falls within advisor availability
  const availability = await AdvisorAvailability.findOne({
    advisorUserId,
  }).lean();

  if (!availability || !availability.weeklySlots.length) {
    const err = new Error(
      "Advisor has no availability configured"
    );
    err.statusCode = 400;
    throw err;
  }

  const validSlot = availability.weeklySlots.some((slot) => {
    return (
      isWithinWeeklySlot(start, slot) &&
      isWithinWeeklySlot(new Date(end.getTime() - 1), slot)
    );
  });

  if (!validSlot) {
    const err = new Error(
      "Requested time is outside advisor availability"
    );
    err.statusCode = 400;
    throw err;
  }

  // Check for overlap with existing sessions
  const overlapping = await AdvisorSession.findOne({
    advisorUserId,
    status: { $in: ["requested", "confirmed"] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  })
    .select("_id")
    .lean();

  if (overlapping) {
    const err = new Error(
      "Requested time conflicts with another session"
    );
    err.statusCode = 400;
    throw err;
  }

  const status =
    role === "advisor" ? "confirmed" : "requested";

      const profile = await AdvisorProfile.findOne({
    userId: String(advisorUserId),
  }).lean();

  let isBillable = false;
  let rateAmount = null;
  let currency = "USD";
  let paymentStatus = "untracked";

  if (profile && profile.isPaidCoach) {
    isBillable = true;
    if (
      typeof profile.billingRateAmount === "number" &&
      !Number.isNaN(profile.billingRateAmount)
    ) {
      rateAmount = profile.billingRateAmount;
    }
    if (profile.billingCurrency) {
      currency = profile.billingCurrency;
    }
    paymentStatus = "pending";
  }
  const session = await AdvisorSession.create({
    relationshipId: relationship._id,
    ownerUserId,
    advisorUserId,
    createdByRole: role,
    createdByUserId: createdByUserId,
    startTime: start,
    endTime: end,
    sessionType,
    status,
    note: (note || "").trim().slice(0, 2000),
      isBillable,
    rateAmount,
    currency,
    paymentStatus,
  });

  return mapAdvisorSession(session)
}
export async function updateAdvisorSession({
  sessionId,
  role,
  userId,
  status,
}) {
  const session = await AdvisorSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }

  const relationship = await AdvisorRelationship.findById(
    session.relationshipId
  ).lean();
  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();

  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error(
        "You do not have access to this session"
      );
      err.statusCode = 403;
      throw err;
    }

    // Candidate can cancel upcoming requested/confirmed sessions
    if (
      status === "canceled" &&
      session.startTime > now &&
      ["requested", "confirmed"].includes(session.status)
    ) {
      session.status = "canceled";
    } else {
      const err = new Error(
        "You cannot perform this status change"
      );
      err.statusCode = 400;
      throw err;
    }
  } else if (role === "advisor") {
    if (relationship.advisorUserId !== String(userId)) {
      const err = new Error(
        "You do not have access to this session"
      );
      err.statusCode = 403;
      throw err;
    }

    if (status === "confirmed") {
      if (session.status === "requested") {
        session.status = "confirmed";
      } else {
        const err = new Error(
          "Only requested sessions can be confirmed"
        );
        err.statusCode = 400;
        throw err;
      }
    } else if (status === "canceled") {
      if (
        ["requested", "confirmed"].includes(
          session.status
        ) &&
        session.startTime > now
      ) {
        session.status = "canceled";
      } else {
        const err = new Error(
          "Cannot cancel this session"
        );
        err.statusCode = 400;
        throw err;
      }
    } else if (status === "completed") {
      if (
        ["confirmed"].includes(session.status) &&
        session.startTime <= now
      ) {
        session.status = "completed";
      } else {
        const err = new Error(
          "Cannot mark this session as completed"
        );
        err.statusCode = 400;
        throw err;
      }
    } else {
      const err = new Error("Invalid status");
      err.statusCode = 400;
      throw err;
    }
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  await session.save();

  return {
    id: session._id.toString(),
    relationshipId: session.relationshipId.toString(),
    ownerUserId: session.ownerUserId,
    advisorUserId: session.advisorUserId,
    createdByRole: session.createdByRole,
    createdByUserId: session.createdByUserId,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionType: session.sessionType,
    status: session.status,
    jobId: session.jobId,
    resumeId: session.resumeId,
    coverLetterId: session.coverLetterId,
    note: session.note,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}


function mapAdvisorSession(session) {
  return {
    id: session._id.toString(),
    relationshipId: session.relationshipId.toString(),
    ownerUserId: session.ownerUserId,
    advisorUserId: session.advisorUserId,
    createdByRole: session.createdByRole,
    createdByUserId: session.createdByUserId,
    startTime: session.startTime,
    endTime: session.endTime,
    sessionType: session.sessionType,
    status: session.status,
    jobId: session.jobId,
    resumeId: session.resumeId,
    coverLetterId: session.coverLetterId,
    note: session.note,
    // NEW billing-related fields
    isBillable: !!session.isBillable,
    rateAmount:
      typeof session.rateAmount === "number"
        ? session.rateAmount
        : null,
    currency: session.currency || "USD",
    paymentStatus: session.paymentStatus || "untracked",
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    candidateRating:
    typeof session.candidateRating === "number"
      ? session.candidateRating
      : null,
  candidateFeedback: session.candidateFeedback || "",
  };
}
export async function getAdvisorBillingSettings(advisorUserId) {
  const profile = await AdvisorProfile.findOne({
    userId: String(advisorUserId),
  }).lean();

  if (!profile) {
    return {
      isPaidCoach: false,
      rateAmount: 0,
      currency: "USD",
    };
  }

  return {
    isPaidCoach: !!profile.isPaidCoach,
    rateAmount:
      typeof profile.billingRateAmount === "number"
        ? profile.billingRateAmount
        : 0,
    currency: profile.billingCurrency || "USD",
  };
}

export async function updateAdvisorBillingSettings({
  advisorUserId,
  isPaidCoach,
  rateAmount,
  currency,
}) {
  const update = {
    isPaidCoach: !!isPaidCoach,
    billingRateAmount:
      typeof rateAmount === "number" && !Number.isNaN(rateAmount)
        ? rateAmount
        : 0,
    billingCurrency: currency || "USD",
  };

  const profile = await AdvisorProfile.findOneAndUpdate(
    { userId: String(advisorUserId) },
    { $set: update },
    { upsert: true, new: true }
  ).lean();

  return {
    isPaidCoach: !!profile.isPaidCoach,
    rateAmount:
      typeof profile.billingRateAmount === "number"
        ? profile.billingRateAmount
        : 0,
    currency: profile.billingCurrency || "USD",
  };
}


export async function updateAdvisorSessionPayment({
  sessionId,
  advisorUserId,
  paymentStatus,
}) {
  const allowed = ["pending", "paid", "refunded", "untracked"];
  if (!allowed.includes(paymentStatus)) {
    const err = new Error("Invalid paymentStatus");
    err.statusCode = 400;
    throw err;
  }

  const session = await AdvisorSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }

  if (session.advisorUserId !== String(advisorUserId)) {
    const err = new Error("Not authorized to update payment for this session");
    err.statusCode = 403;
    throw err;
  }

  session.paymentStatus = paymentStatus;
  await session.save();

  return mapAdvisorSession(session);
}


export async function updateAdvisorSessionFeedback({
  sessionId,
  role,
  userId,
  rating,
  feedback,
}) {
  const session = await AdvisorSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found");
    err.statusCode = 404;
    throw err;
  }

  const relationship = await AdvisorRelationship.findById(
    session.relationshipId
  ).lean();
  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  if (session.status !== "completed" ) {
    const err = new Error(
      "Feedback can only be left on completed sessions"
    );
    err.statusCode = 400;
    throw err;
  }

  if (role === "candidate") {
    if (relationship.ownerUserId !== String(userId)) {
      const err = new Error(
        "You do not have permission to rate this session"
      );
      err.statusCode = 403;
      throw err;
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      const err = new Error("Rating must be between 1 and 5");
      err.statusCode = 400;
      throw err;
    }

    session.candidateRating = rating;
    session.candidateFeedback =
      (feedback || "").toString().trim().slice(0, 2000);
  } else if (role === "advisor") {
    // (Optional) later we can support advisor-only notes here.
    const err = new Error(
      "Advisor feedback updates not implemented yet"
    );
    err.statusCode = 400;
    throw err;
  } else {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }

  await session.save();

  return mapAdvisorSession(session)
}


// export async function getAdvisorPerformanceSummary({
//   advisorUserId,
// }) {
//   // Find all active relationships for this advisor
//   const relationships = await AdvisorRelationship.find({
//     advisorUserId: String(advisorUserId),
//     status: "active",
//   }).lean();

//   if (relationships.length === 0) {
//     return {
//       advisorUserId: String(advisorUserId),
//       totalClients: 0,
//       totalSessions: 0,
//       completedSessions: 0,
//       ratedSessions: 0,
//       averageRating: null,
//     };
//   }

//   const relationshipIds = relationships.map((r) => r._id);

//   const sessions = await AdvisorSession.find({
//     advisorUserId: String(advisorUserId),
//     relationshipId: { $in: relationshipIds },
//   }).lean();

//   const totalSessions = sessions.length;
//   const completedSessions = sessions.filter(
//     (s) => s.status === "completed"
//   );

//   const ratedSessions = completedSessions.filter(
//     (s) =>
//       typeof s.candidateRating === "number" &&
//       !Number.isNaN(s.candidateRating)
//   );

//   const averageRating =
//     ratedSessions.length > 0
//       ? ratedSessions.reduce(
//           (sum, s) => sum + s.candidateRating,
//           0
//         ) / ratedSessions.length
//       : null;

//   return {
//     advisorUserId: String(advisorUserId),
//     totalClients: relationships.length,
//     totalSessions,
//     completedSessions: completedSessions.length,
//     ratedSessions: ratedSessions.length,
//     averageRating,
//   };
// }

export async function getAdvisorPerformanceSummary(advisorUserId) {
  const advisorId = String(advisorUserId);

  const relationships = await AdvisorRelationship.find({
    advisorUserId: advisorId,
    status: "active",
  })
    .select("_id ownerUserId sharedJobIds")
    .lean();

  if (!relationships.length) {
    return {
      totalClients: 0,
      completedSessions: 0,
      ratedSessions: 0,
      averageRating: null,
      sharedJobsAtInterviewStage: 0,
      sharedJobsWithOffers: 0,
    };
  }

  const relationshipIds = relationships.map((r) => r._id);

  // Sessions across all active clients for this advisor
  const sessions = await AdvisorSession.find({
    advisorUserId: advisorId,
    relationshipId: { $in: relationshipIds },
  })
    .select("status candidateRating")
    .lean();

  const completedSessions = sessions.filter(
    (s) => s.status === "completed"
  ).length;

  // Rating is future-proofed: if you later add candidateRating to the model,
  // this starts working automatically.
  let ratedSessions = 0;
  let ratingSum = 0;
  for (const s of sessions) {
    if (typeof s.candidateRating === "number") {
      ratedSessions += 1;
      ratingSum += s.candidateRating;
    }
  }
  const averageRating =
    ratedSessions > 0 ? ratingSum / ratedSessions : null;

  // Impact: look only at jobs that have been explicitly shared
  const allSharedJobIds = [
    ...new Set(
      relationships.flatMap((r) =>
        Array.isArray(r.sharedJobIds)
          ? r.sharedJobIds.map((id) => String(id))
          : []
      )
    ),
  ];

  let sharedJobsAtInterviewStage = 0;
  let sharedJobsWithOffers = 0;

  if (allSharedJobIds.length > 0) {
    const jobs = await Job.find({
      _id: { $in: allSharedJobIds },
    })
      .select("status")
      .lean();

    for (const j of jobs) {
      if (
        j.status === "phone_screen" ||
        j.status === "interview"
      ) {
        sharedJobsAtInterviewStage += 1;
      }
      if (j.status === "offer") {
        sharedJobsWithOffers += 1;
      }
    }
  }

  return {
    totalClients: relationships.length,
    completedSessions,
    ratedSessions,
    averageRating,
    sharedJobsAtInterviewStage,
    sharedJobsWithOffers,
  };
}


// --- NEW: per-relationship impact (advisor ↔ client) ---
export async function getAdvisorRelationshipImpact({
  relationshipId,
  advisorUserId,
}) {
  const relationship = await AdvisorRelationship.findById(
    relationshipId
  )
    .select(
      "ownerUserId advisorUserId sharedJobIds status"
    )
    .lean();

  if (!relationship) {
    const err = new Error("Advisor relationship not found");
    err.statusCode = 404;
    throw err;
  }

  if (String(relationship.advisorUserId) !== String(advisorUserId)) {
    const err = new Error(
      "You are not allowed to view impact for this relationship"
    );
    err.statusCode = 403;
    throw err;
  }

  if (relationship.status !== "active") {
    return {
      relationshipId: String(relationshipId),
      ownerUserId: String(relationship.ownerUserId),
      advisorUserId: String(relationship.advisorUserId),
      sharedJobCount: 0,
      sharedJobsAtInterviewStage: 0,
      sharedJobsWithOffers: 0,
      totalRecommendations: 0,
      completedRecommendations: 0,
      declinedRecommendations: 0,
      completedSessions: 0,
      upcomingSessions: 0,
    };
  }

  const ownerUserId = String(relationship.ownerUserId);
  const advisorId = String(relationship.advisorUserId);

  // Jobs that were explicitly shared with this advisor
  const sharedJobIds = Array.isArray(relationship.sharedJobIds)
    ? relationship.sharedJobIds
    : [];

  let sharedJobsAtInterviewStage = 0;
  let sharedJobsWithOffers = 0;

  if (sharedJobIds.length > 0) {
    const jobs = await Job.find({
      _id: { $in: sharedJobIds },
      userId: ownerUserId, // adjust field name if your Job uses ownerUserId instead
    })
      .select("status")
      .lean();

    for (const j of jobs) {
      if (
        j.status === "phone_screen" ||
        j.status === "interview"
      ) {
        sharedJobsAtInterviewStage += 1;
      }
      if (j.status === "offer") {
        sharedJobsWithOffers += 1;
      }
    }
  }

  const sharedJobCount = sharedJobIds.length;

  // Recommendations for this relationship
  const recs = await AdvisorRecommendation.find({
    relationshipId,
    advisorUserId: advisorId,
  })
    .select("status")
    .lean();

  const totalRecommendations = recs.length;
  const completedRecommendations = recs.filter(
    (r) => r.status === "completed"
  ).length;
  const declinedRecommendations = recs.filter(
    (r) => r.status === "declined"
  ).length;

  // Sessions for this relationship
  const sessions = await AdvisorSession.find({
    relationshipId,
    advisorUserId: advisorId,
  })
    .select("status startTime")
    .lean();

  const now = new Date();
  let completedSessions = 0;
  let upcomingSessions = 0;

  for (const s of sessions) {
    if (s.status === "completed") {
      completedSessions += 1;
    } else if (
      (s.status === "requested" ||
        s.status === "confirmed") &&
      s.startTime > now
    ) {
      upcomingSessions += 1;
    }
  }

  return {
    relationshipId: String(relationshipId),
    ownerUserId,
    advisorUserId: advisorId,
    sharedJobCount,
    sharedJobsAtInterviewStage,
    sharedJobsWithOffers,
    totalRecommendations,
    completedRecommendations,
    declinedRecommendations,
    completedSessions,
    upcomingSessions,
  };
}