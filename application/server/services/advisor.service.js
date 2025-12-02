// services/advisor.service.js
import crypto from "crypto";
import AdvisorRelationship from "../models/Advisor/AdvisorRelationship.js";
import AdvisorProfile from "../models/Advisor/AdvisorProfile.js";
import Profile from "../models/profile.js";
import Jobs from "../models/jobs.js"; // note: using your actual filenames
import { sendAdvisorInviteEmail } from "./emailService.js";

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
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
