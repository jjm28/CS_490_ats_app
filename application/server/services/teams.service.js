// server/services/teams.service.js
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { findUserByEmail } from "./user.service.js";
import { sendTeamInviteEmail } from "./email.service.js";


// Data sources for shared docs
import { getCoverletter } from "./coverletter.service.js";
import { getResume } from "./resume.service.js";
import { getProjectsByUserId } from "./projects.service.js";
import { getEducationByUserId } from "./education.service.js";
import { listEmployment } from "./employment.service.js";

import Resume from "../models/resume.js";
import Coverletter from "../models/coverletters.js";

import { getJobStats } from "./jobs.service.js";
import { getProductivitySummary } from "./productivity.service.js";
import { computeCompetitiveAnalysis } from "./competitiveAnalysis.service.js";

const TEAM_COLLECTION = "teams";
const MEMBERSHIP_COLLECTION = "teamMemberships";

/**
 * Create a new team.
 * - The creator becomes admin + mentor.
 *
 * @param {Object} params
 * @param {string} params.ownerId
 * @param {string} params.name
 * @param {string} [params.description]
 * @param {string} [params.billingPlan]
 * @param {string|null} [params.ownerEmail]
 */
export async function createTeam({
  ownerId,
  name,
  description,
  billingPlan = "free",
  ownerEmail = null,
}) {
  if (!ownerId) throw new Error("ownerId is required");
  if (!name) throw new Error("Team name is required");

  const db = getDb();
  const TEAM_COLLECTION = "teams";
  const MEMBERSHIP_COLLECTION = "teamMemberships";
  const teams = db.collection(TEAM_COLLECTION);
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const now = new Date();

  const teamDoc = {
    name: name.trim(),
    description: (description || "").trim(),
    createdBy: ownerId.toString(),
    adminId: ownerId.toString(),
    billing: {
      plan: billingPlan,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await teams.insertOne(teamDoc);
  const teamId = result.insertedId;

  // Try to hydrate creator's email for a human-friendly list view
  let creatorEmail = ownerEmail ? String(ownerEmail).toLowerCase() : null;

  if (!creatorEmail) {
    try {
      // Prefer the "users" collection for core authentication data
      const userDoc = await db
        .collection("users")
        .findOne({ _id: ownerId.toString() }, { projection: { email: 1 } });

      if (userDoc?.email) {
        creatorEmail = String(userDoc.email).toLowerCase();
      } else {
        // Fallback to the "profiles" collection (used by resume/profile)
        const profileDoc = await db
          .collection("profiles")
          .findOne(
            { userId: ownerId.toString() },
            { projection: { "ProfileHistory.email": 1, email: 1 } }
          );

        creatorEmail =
          profileDoc?.ProfileHistory?.email ||
          profileDoc?.email ||
          null;

        if (creatorEmail) {
          creatorEmail = String(creatorEmail).toLowerCase();
        }
      }
    } catch (err) {
      console.warn("Unable to resolve creator email for team:", err.message);
    }
  }

  // Construct the membership entry
  const membershipDoc = {
    teamId,
    userId: ownerId.toString(),
    roles: ["admin", "mentor"],
    status: "active",
    invitedBy: null,
    invitedAt: null,
    acceptedAt: now,
    createdAt: now,
    updatedAt: now,
    invitedEmail: creatorEmail || null,
  };

  await memberships.insertOne(membershipDoc);

  // 🔹 Optional placeholder for shared document visibility
  try {
    await db.collection("team_visibility").insertOne({
      teamId,
      ownerId: ownerId.toString(),
      visibleSections: ["profile", "resume", "coverletter"], // default visible to admin/mentor
      createdAt: now,
      updatedAt: now,
    });
  } catch (e) {
    console.warn("Optional team_visibility setup failed:", e.message);
  }

  return {
    _id: teamId,
    ...teamDoc,
  };
}

/**
 * List teams (and invites) the user belongs to.
 */
export async function listTeamsForUser({ userId }) {
  if (!userId) throw new Error("userId is required");

  const db = getDb();
  const teams = db.collection(TEAM_COLLECTION);
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const memberDocs = await memberships
    .find({ userId: userId.toString(), status: { $ne: "removed" } })
    .toArray();

  if (memberDocs.length === 0) return [];

  const teamIds = [
    ...new Set(
      memberDocs.map((m) =>
        m.teamId instanceof ObjectId ? m.teamId : new ObjectId(m.teamId)
      )
    ),
  ];

  const teamDocs = await teams
    .find({ _id: { $in: teamIds } })
    .toArray();

  const teamById = new Map(teamDocs.map((t) => [t._id.toString(), t]));

  return memberDocs.map((m) => {
    const t = teamById.get(m.teamId.toString());
    return {
      teamId: m.teamId.toString(),
      roles: m.roles,
      status: m.status,
      team: t
        ? {
            _id: t._id,
            name: t.name,
            description: t.description,
            billing: t.billing,
            createdBy: t.createdBy,
            adminId: t.adminId,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }
        : null,
    };
  });
}

/**
 * Ensure the requesting user is an active admin on the team.
 */
async function requireAdmin({ db, userId, teamId }) {
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const membership = await memberships.findOne({
    teamId: teamObjectId,
    userId: userId.toString(),
    status: "active",
    roles: { $in: ["admin"] },
  });

  if (!membership) {
    const err = new Error("Not authorized to manage this team");
    err.code = "FORBIDDEN";
    throw err;
  }

  return membership;
}

async function requireCoach({ db, userId, teamId }) {
  const memberships = db.collection(MEMBERSHIP_COLLECTION);
  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const membership = await memberships.findOne({
    teamId: teamObjectId,
    userId: userId.toString(),
    status: "active",
    roles: { $in: ["admin", "mentor"] },
  });

  if (!membership) {
    const err = new Error("Not authorized to manage jobs for this team");
    err.code = "FORBIDDEN";
    throw err;
  }

  return membership;
}


/**
 * Return a team + its members.
 */

export async function getTeamById(teamId) {
  const db = getDb();
  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) throw new Error("Team not found");
  return team;
}

export async function getTeamWithMembers({
  userId,
  teamId,
  currentUserEmail = null,
}) {
  if (!userId) throw new Error("userId is required");
  if (!teamId) throw new Error("teamId is required");

  const db = getDb();
  const teams = db.collection(TEAM_COLLECTION);
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const team = await teams.findOne({ _id: teamObjectId });
  if (!team) {
    const err = new Error("Team not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Only members can view the team (including invited)
  const userMembership = await memberships.findOne({
    teamId: teamObjectId,
    userId: userId.toString(),
    status: { $ne: "removed" },
  });

  if (!userMembership) {
    const err = new Error("You are not a member of this team");
    err.code = "FORBIDDEN";
    throw err;
  }

  const members = await memberships
    .find({ teamId: teamObjectId, status: { $ne: "removed" } })
    .toArray();

  // Collect userIds so we can hydrate basic info
  const userIdsSet = new Set();
  for (const m of members) {
    if (m.userId) userIdsSet.add(m.userId.toString());
    if (m.invitedBy) userIdsSet.add(m.invitedBy.toString());
  }
  const userIds = [...userIdsSet];

  let users = [];
  let profiles = [];
  if (userIds.length > 0) {
    users = await db
      .collection("users")
      .find(
        { _id: { $in: userIds } },
        { projection: { email: 1, firstName: 1, lastName: 1 } }
      )
      .toArray();

    profiles = await db
      .collection("profiles")
      .find(
        { userId: { $in: userIds } },
        { projection: { userId: 1, "ProfileHistory.email": 1, email: 1 } }
      )
      .toArray();
  }
  

  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  const profileByUserId = new Map(
    profiles.map((p) => [p.userId ? p.userId.toString() : null, p])
  );

  const membersWithUser = members.map((m) => {
    const uid = m.userId ? m.userId.toString() : null;
    const inviterId = m.invitedBy ? m.invitedBy.toString() : null;

    const u = uid ? userById.get(uid) : null;
    const profile = uid ? profileByUserId.get(uid) : null;

    const inviterUser = inviterId ? userById.get(inviterId) : null;
    const inviterProfile = inviterId
      ? profileByUserId.get(inviterId)
      : null;

    const nameParts = [];
    if (u && u.firstName) nameParts.push(u.firstName);
    if (u && u.lastName) nameParts.push(u.lastName);
    const name = nameParts.length ? nameParts.join(" ") : null;

    const profileEmail =
      (profile &&
        profile.ProfileHistory &&
        profile.ProfileHistory.email) ||
      (profile && profile.email) ||
      null;

    let userEmail =
      (u && u.email && String(u.email).toLowerCase()) ||
      (profileEmail && String(profileEmail).toLowerCase()) ||
      (m.invitedEmail && String(m.invitedEmail).toLowerCase()) ||
      null;

    // Fallback: if this member is the creator and we still don't have an email,
    // use the current user's email from the token.
    if (
      !userEmail &&
      currentUserEmail &&
      uid &&
      uid === team.createdBy
    ) {
      userEmail = String(currentUserEmail).toLowerCase();
    }

    const inviterProfileEmail =
      (inviterProfile &&
        inviterProfile.ProfileHistory &&
        inviterProfile.ProfileHistory.email) ||
      (inviterProfile && inviterProfile.email) ||
      null;

    const invitedByEmail =
      (inviterUser &&
        inviterUser.email &&
        String(inviterUser.email).toLowerCase()) ||
      (inviterProfileEmail &&
        String(inviterProfileEmail).toLowerCase()) ||
      null;

    return {
      _id: m._id,
      userId: m.userId,
      email: userEmail,
      name,
      roles: m.roles,
      status: m.status,
      invitedBy: m.invitedBy || null,
      invitedByEmail,
      invitedEmail: m.invitedEmail || null,
      invitedAt: m.invitedAt,
      acceptedAt: m.acceptedAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  });

  return {
    team: {
      _id: team._id,
      name: team.name,
      description: team.description,
      billing: team.billing,
      createdBy: team.createdBy,
      adminId: team.adminId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    },
    members: membersWithUser,
  };
}

/**
 * Invite an existing user (already in DB) to the team.
 * - Only admins can invite.
 * - If the email does not exist in `users`, throws USER_NOT_FOUND.
 * - Creates a membership with status "invited" that the other user will see.
 * - Triggers an email (stubbed via sendTeamInviteEmail).
 */
export async function inviteTeamMember({
  adminId,
  teamId,
  email,
  role,
}) {
  if (!adminId) throw new Error("adminId is required");
  if (!teamId) throw new Error("teamId is required");
  if (!email) throw new Error("email is required");

  const normalizedRole = String(role || "").toLowerCase();
  if (!["mentor", "candidate"].includes(normalizedRole)) {
    const err = new Error("Role must be 'mentor' or 'candidate'");
    err.code = "BAD_ROLE";
    throw err;
  }

  const db = getDb();
  const teams = db.collection(TEAM_COLLECTION);
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const team = await teams.findOne({ _id: teamObjectId });
  if (!team) {
    const err = new Error("Team not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Ensure caller is an admin on this team
  await requireAdmin({ db, userId: adminId, teamId });

  // Look up invited user by email in DB
  const user = await findUserByEmail(email);
  if (!user) {
    const err = new Error(
      "No existing user found with that email. Invites are limited to registered users."
    );
    err.code = "USER_NOT_FOUND";
    throw err;
  }

  const targetUserId = user._id.toString();
  const normalizedEmail = String(user.email || email).toLowerCase();
  const now = new Date();

  // Do they already have a membership (active or invited)?
  const existing = await memberships.findOne({
    teamId: teamObjectId,
    userId: targetUserId,
    status: { $ne: "removed" },
  });

  if (existing) {
    return {
      membership: existing,
      alreadyMember: true,
    };
  }

  const membershipDoc = {
    teamId: teamObjectId,
    userId: targetUserId,
    roles: normalizedRole === "mentor" ? ["mentor"] : ["candidate"],
    status: "invited",
    invitedBy: adminId.toString(),
    invitedEmail: normalizedEmail,
    invitedAt: now,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await memberships.insertOne(membershipDoc);

  // Try to send an email, but don't fail the request if email sending breaks.
  try {
    const inviterUser = await db
      .collection("users")
      .findOne(
        { _id: adminId.toString() },
        { projection: { email: 1, firstName: 1, lastName: 1 } }
      );

    const inviterEmail = inviterUser?.email || null;
    const inviterName = inviterUser
      ? `${inviterUser.firstName || ""} ${inviterUser.lastName || ""}`.trim() ||
        null
      : null;

    await sendTeamInviteEmail({
      to: normalizedEmail,
      teamName: team.name,
      invitedRole: normalizedRole,
      inviterName,
      inviterEmail,
    });
  } catch (emailErr) {
    console.warn("Failed to send team invite email:", emailErr);
  }

  return {
    membership: {
      ...membershipDoc,
      _id: result.insertedId,
    },
    alreadyMember: false,
  };
}

/**
 * Accept an invite for the current user.
 */
export async function acceptTeamInvite({ userId, teamId }) {
  if (!userId) throw new Error("userId is required");
  if (!teamId) throw new Error("teamId is required");

  const db = getDb();
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);
  const now = new Date();

  const result = await memberships.findOneAndUpdate(
    {
      teamId: teamObjectId,
      userId: userId.toString(),
      status: "invited",
    },
    {
      $set: {
        status: "active",
        acceptedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  if (!result.value) {
    const err = new Error("No pending invite found for this team");
    err.code = "INVITE_NOT_FOUND";
    throw err;
  }

  return result.value;
}

/**
 * Decline / ignore an invite for the current user.
 * We mark it as removed so it disappears from lists.
 */
export async function declineTeamInvite({ userId, teamId }) {
  if (!userId) throw new Error("userId is required");
  if (!teamId) throw new Error("teamId is required");

  const db = getDb();
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);
  const now = new Date();

  const result = await memberships.findOneAndUpdate(
    {
      teamId: teamObjectId,
      userId: userId.toString(),
      status: "invited",
    },
    {
      $set: {
        status: "removed",
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  if (!result.value) {
    const err = new Error("No pending invite found for this team");
    err.code = "INVITE_NOT_FOUND";
    throw err;
  }

  return result.value;
}

/**
 * Update a member's roles (admin-only).
 */
export async function updateMemberRoles({
  adminId,
  teamId,
  memberUserId,
  roles,
}) {
  if (!adminId) throw new Error("adminId is required");
  if (!teamId) throw new Error("teamId is required");
  if (!memberUserId) throw new Error("memberUserId is required");

  const db = getDb();
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  await requireAdmin({ db, userId: adminId, teamId });

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const membership = await memberships.findOne({
    teamId: teamObjectId,
    userId: memberUserId.toString(),
    status: { $ne: "removed" },
  });

  if (!membership) {
    const err = new Error("Member not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const normalizedRoles = Array.isArray(roles)
    ? roles.map((r) => String(r).toLowerCase())
    : [];

  if (!normalizedRoles.length) {
    const err = new Error("At least one role is required");
    err.code = "BAD_ROLES";
    throw err;
  }

  // Prevent last admin from losing admin role
  const isRemovingAdmin = !normalizedRoles.includes("admin");
  if (
    isRemovingAdmin &&
    membership.roles.includes("admin") &&
    membership.userId.toString() === adminId.toString()
  ) {
    const otherAdminsCount = await memberships.countDocuments({
      teamId: teamObjectId,
      status: "active",
      roles: { $in: ["admin"] },
      userId: { $ne: adminId.toString() },
    });

    if (otherAdminsCount === 0) {
      const err = new Error("You cannot remove the last admin from the team");
      err.code = "LAST_ADMIN";
      throw err;
    }
  }

  const now = new Date();

  const result = await memberships.findOneAndUpdate(
    {
      teamId: teamObjectId,
      userId: memberUserId.toString(),
      status: { $ne: "removed" },
    },
    { $set: { roles: normalizedRoles, updatedAt: now } },
    { returnDocument: "after" }
  );

  return result.value;
}

/**
 * Remove (soft delete) a member from the team (admin-only).
 */
export async function removeMember({ adminId, teamId, memberUserId }) {
  if (!adminId) throw new Error("adminId is required");
  if (!teamId) throw new Error("teamId is required");
  if (!memberUserId) throw new Error("memberUserId is required");

  const db = getDb();
  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  await requireAdmin({ db, userId: adminId, teamId });

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const membership = await memberships.findOne({
    teamId: teamObjectId,
    userId: memberUserId.toString(),
    status: { $ne: "removed" },
  });

  if (!membership) {
    const err = new Error("Member not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Prevent removing the last admin
  if (membership.roles.includes("admin")) {
    const otherAdminsCount = await memberships.countDocuments({
      teamId: teamObjectId,
      status: "active",
      roles: { $in: ["admin"] },
      userId: { $ne: memberUserId.toString() },
    });

    if (otherAdminsCount === 0) {
      const err = new Error("You cannot remove the last admin from the team");
      err.code = "LAST_ADMIN";
      throw err;
    }
  }

  const now = new Date();

  const result = await memberships.findOneAndUpdate(
    {
      teamId: teamObjectId,
      userId: memberUserId.toString(),
      status: { $ne: "removed" },
    },
    {
      $set: {
        status: "removed",
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );

  return result.value;
}

// ---------------------------
// Sharing / aggregated docs
// ---------------------------
export async function getCandidateSharedDocs(userIds) {
  const db = getDb();
  const results = [];

  for (const userId of userIds) {
    const ownerId = userId.toString();

    // Fetch basic user info
    const user = await db.collection("users").findOne(
      { _id: ownerId },
      { projection: { email: 1, firstName: 1, lastName: 1 } }
    );

    const candidate = {
      id: ownerId,
      email: user?.email || null,
      name:
        user && (user.firstName || user.lastName)
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : null,
    };

    // Fetch shared docs only
    const profiles = await db
      .collection("profiles")
      .find({ userId: ownerId, isShared: true })
      .project({
        _id: 1,
        userId: 1,
        headline: 1,
        location: 1,
        updatedAt: 1,
        isShared: 1,
      })
      .toArray();

    const resumes = await db
      .collection("resumes")
      .find({ owner: ownerId, isShared: true })
      .project({
        _id: 1,
        owner: 1,
        filename: 1,
        templateKey: 1,
        lastSaved: 1,
        isShared: 1,
      })
      .toArray();

    const coverletters = await db
      .collection("coverletters")
      .find({ owner: ownerId, isShared: true })
      .project({
        _id: 1,
        owner: 1,
        filename: 1,
        templateKey: 1,
        lastSaved: 1,
        isShared: 1,
      })
      .toArray();

    if (
      profiles.length > 0 ||
      resumes.length > 0 ||
      coverletters.length > 0
    ) {
      results.push({
        candidate,
        sharedDocs: { profiles, resumes, coverletters },
      });
    }
  }

  return results;
}

export async function getMySharedDocs(userId) {
  const db = getDb();
  const ownerId = userId.toString();

  // Profile: stored in "profiles" with a userId field
  const profiles = await db
    .collection("profiles")
    .find({ userId: ownerId })
    .project({
      _id: 1,
      userId: 1,
      headline: 1,
      location: 1,
      updatedAt: 1,
      isShared: 1,          // flag we toggle below
    })
    .toArray();

  // Resumes: created in resume.service with { owner: userid, ... }
  const resumes = await db
    .collection("resumes")
    .find({ owner: ownerId })
    .project({
      _id: 1,
      owner: 1,
      filename: 1,
      templateKey: 1,
      lastSaved: 1,
      tags: 1,
      isShared: 1,          // may be missing on old docs, that's fine
    })
    .sort({ lastSaved: -1 })
    .toArray();

  // Cover letters: created in coverletter.service with { owner: userid, ... }
  const coverletters = await db
    .collection("coverletters")
    .find({ owner: ownerId })
    .project({
      _id: 1,
      owner: 1,
      filename: 1,
      templateKey: 1,
      lastSaved: 1,
      isShared: 1,
    })
    .sort({ lastSaved: -1 })
    .toArray();

  // CandidateSharingPage expects this exact shape
  return {
    profiles,
    resumes,
    coverletters,
  };
}


// ---------------------------
// Sharing toggles
// ---------------------------
export async function toggleProfileSharing(userId, share) {
  const db = getDb();
  const ownerId = userId.toString();

  await db.collection("profiles").updateOne(
    { userId: ownerId },
    {
      $set: {
        isShared: !!share,
        sharedUpdatedAt: new Date(),
      },
    },
    // if a profile doc doesn't exist yet, create one with this flag
    { upsert: true }
  );
}


export async function toggleResumeSharing(userId, resumeId, share) {
  const db = getDb();
  const ownerId = userId.toString();

  await db.collection("resumes").updateOne(
    { _id: new ObjectId(resumeId), owner: ownerId },
    {
      $set: {
        isShared: !!share,
        sharedUpdatedAt: new Date(),
      },
    }
  );
}

export async function toggleCoverletterSharing(userId, coverletterId, share) {
  const db = getDb();
  const ownerId = userId.toString();

  await db.collection("coverletters").updateOne(
    { _id: new ObjectId(coverletterId), owner: ownerId },
    {
      $set: {
        isShared: !!share,
        sharedUpdatedAt: new Date(),
      },
    }
  );
}

export async function getTeamResumeForExport({ viewerId, teamId, resumeId }) {
  const db = getDb();

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  // Ensure viewer is admin or mentor on this team
  const memberships = db.collection(MEMBERSHIP_COLLECTION);
  const viewerMembership = await memberships.findOne({
    teamId: teamObjectId,
    userId: viewerId.toString(),
    status: "active",
    roles: { $in: ["admin", "mentor"] },
  });

  if (!viewerMembership) {
    const err = new Error(
      "You are not authorized to export documents for this team"
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  // Load the resume and ensure it's shared
  const resumesColl = db.collection("resumes");
  const resumeDoc = await resumesColl.findOne({
    _id: new ObjectId(resumeId),
    isShared: true,
  });

  if (!resumeDoc) {
    const err = new Error("Resume not found or not shared");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Make sure the owner is an active candidate on this team
  const candidateMembership = await memberships.findOne({
    teamId: teamObjectId,
    userId: resumeDoc.owner,
    status: "active",
    roles: { $in: ["candidate"] },
  });

  if (!candidateMembership) {
    const err = new Error(
      "This resume does not belong to a candidate on this team"
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  // Return only what's needed for export
  return {
    _id: resumeDoc._id,
    owner: resumeDoc.owner,
    filename: resumeDoc.filename,
    templateKey: resumeDoc.templateKey,
    lastSaved: resumeDoc.lastSaved,
    resumedata: resumeDoc.resumedata, // <-- front-end will use this to build the PDF
  };
}

/**
 * Same idea as above, but for cover letters.
 */
export async function getTeamCoverletterForExport({
  viewerId,
  teamId,
  coverletterId,
}) {
  const db = getDb();

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  const memberships = db.collection(MEMBERSHIP_COLLECTION);

  // Viewer must be admin or mentor
  const viewerMembership = await memberships.findOne({
    teamId: teamObjectId,
    userId: viewerId.toString(),
    status: "active",
    roles: { $in: ["admin", "mentor"] },
  });

  if (!viewerMembership) {
    const err = new Error(
      "You are not authorized to export documents for this team"
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  // Load cover letter and ensure it's shared
  const coverlettersColl = db.collection("coverletters");
  const clDoc = await coverlettersColl.findOne({
    _id: new ObjectId(coverletterId),
    isShared: true,
  });

  if (!clDoc) {
    const err = new Error("Cover letter not found or not shared");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Owner must be an active candidate on this team
  const candidateMembership = await memberships.findOne({
    teamId: teamObjectId,
    userId: clDoc.owner,
    status: "active",
    roles: { $in: ["candidate"] },
  });

  if (!candidateMembership) {
    const err = new Error(
      "This cover letter does not belong to a candidate on this team"
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  return {
    _id: clDoc._id,
    owner: clDoc.owner,
    filename: clDoc.filename,
    templateKey: clDoc.templateKey,
    lastSaved: clDoc.lastSaved,
    coverletterdata: clDoc.coverletterdata, // <-- front-end will build PDF from this
  };
}

export const exportTeamResumeService = async (teamId, resumeId) => {
  try {
    const resume = await Resume.findById(resumeId);
    if (!resume) throw new Error("Resume not found");

    return {
      resume: {
        _id: resume._id,
        templateKey: resume.templateKey,
        filename: resume.filename || "resume",
        resumeData: resume.resumedata || {},
        lastSaved: resume.lastSaved || resume.updatedAt,
      },
    };
  } catch (err) {
    console.error("[exportTeamResumeService] Error:", err);
    throw new Error("Failed to export resume");
  }
};

export const exportTeamCoverletterService = async (teamId, coverletterId) => {
  try {
    const coverletter = await Coverletter.findById(coverletterId);
    if (!coverletter) throw new Error("Cover letter not found");

    return {
      coverletter: {
        _id: coverletter._id,
        templateKey: coverletter.templateKey,
        filename: coverletter.filename || "coverletter",
        coverletterData: coverletter.coverletterdata || {},
        lastSaved: coverletter.updatedAt,
      },
    };
  } catch (err) {
    console.error("[exportTeamCoverletterService] Error:", err);
    throw new Error("Failed to export cover letter");
  }
};

export async function getTeamMenteeProgress({ teamId, menteeId }) {
  const db = getDb();
  const memberships = db.collection("teamMemberships");

  const isMember = await memberships.findOne({
    teamId: new ObjectId(teamId),
    userId: menteeId.toString(),
    status: "active",
  });
  if (!isMember) throw new Error("User not in this team");

  // Pull in stats from existing modules
  const jobStats = await getJobStats({ userId: menteeId });
  const productivity = await getProductivitySummary({ userId: menteeId });
  const competitive = await computeCompetitiveAnalysis({ userId: menteeId });

  return {
    menteeId,
    jobStats,
    productivity,
    competitive,
  };
}

//Team Job Recommendations
export async function createTeamJobSuggestion({
  teamId,
  creatorId,
  title,
  company,
  deadline,
  description,
  location,
  link,
}) {
  if (!teamId) throw new Error("teamId is required");
  if (!creatorId) throw new Error("creatorId is required");
  if (!title || !title.trim()) throw new Error("Job title is required");
  if (!company || !company.trim()) throw new Error("Company name is required");
  if (!deadline) throw new Error("Deadline is required");

  const db = getDb();
  const jobs = db.collection("teamJobs");
  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  // Ensure creator is a coach on this team
  await requireCoach({ db, userId: creatorId, teamId: teamObjectId });

  const now = new Date();
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    throw new Error("Invalid deadline date");
  }

  const doc = {
    teamId: teamObjectId,
    createdBy: creatorId.toString(),
    title: title.trim(),
    company: company.trim(),
    deadline: deadlineDate,
    description: (description || "").trim(),
    location: location ? location.trim() : null,
    link: link ? link.trim() : null,
    status: "active", // active | removed
    responses: [], // [{ userId, status: 'applied' | 'not_interested', updatedAt }]
    createdAt: now,
    updatedAt: now,
  };

  const result = await jobs.insertOne(doc);
  return {
    ...doc,
    _id: result.insertedId,
  };
}

//Listing Team Jobs
export async function listTeamJobSuggestions({ teamId, viewerId }) {
  if (!teamId) throw new Error("teamId is required");
  if (!viewerId) throw new Error("viewerId is required");

  const db = getDb();
  const memberships = db.collection(MEMBERSHIP_COLLECTION);
  const jobs = db.collection("teamJobs");
  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);

  // Ensure viewer is a member of this team
  const viewerMembership = await memberships.findOne({
    teamId: teamObjectId,
    userId: viewerId.toString(),
    status: "active",
  });

  if (!viewerMembership) {
    const err = new Error("Team not found or access denied.");
    err.code = "FORBIDDEN";
    throw err;
  }

  const now = new Date();

  // Only active jobs whose deadline has not passed
  const docs = await jobs
    .find({
      teamId: teamObjectId,
      status: "active",
      deadline: { $gte: now },
    })
    .sort({ deadline: 1, createdAt: -1 })
    .toArray();

  if (!docs || docs.length === 0) {
    return [];
  }

  const isCoach = (viewerMembership.roles || []).some((r) =>
    ["admin", "mentor"].includes(r)
  );

  // Collect all userIds we need to hydrate (creator + responders)
  const userIdSet = new Set();
  for (const job of docs) {
    if (job.createdBy) {
      userIdSet.add(job.createdBy.toString());
    }
    const responses = Array.isArray(job.responses) ? job.responses : [];
    for (const r of responses) {
      if (r.userId) userIdSet.add(r.userId.toString());
    }
  }

  let usersById = new Map();
  if (userIdSet.size > 0) {
    const ids = Array.from(userIdSet);
    const users = await db
      .collection("users")
      .find(
        { _id: { $in: ids } },
        { projection: { _id: 1, email: 1, name: 1, firstName: 1, lastName: 1 } }
      )
      .toArray();

    usersById = new Map(users.map((u) => [u._id.toString(), u]));
  }

  return docs.map((job) => {
    const responses = Array.isArray(job.responses) ? job.responses : [];
    const applied = responses.filter((r) => r.status === "applied");
    const notInterested = responses.filter(
      (r) => r.status === "not_interested"
    );

    const myResponse =
      responses.find((r) => r.userId === viewerId.toString()) || null;

    const appliedCandidates = isCoach
      ? applied.map((r) => {
          const u = usersById.get(r.userId.toString());
          const name =
            u?.name ||
            [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
            null;
          return {
            userId: r.userId.toString(),
            name,
            email: u?.email || null,
            respondedAt: r.updatedAt || null,
          };
        })
      : undefined;

    const creatorUser = job.createdBy
      ? usersById.get(job.createdBy.toString())
      : null;

    const creatorName =
      creatorUser?.name ||
      [creatorUser?.firstName, creatorUser?.lastName]
        .filter(Boolean)
        .join(" ") ||
      null;

    return {
      _id: job._id.toString(),
      teamId: job.teamId.toString(),
      title: job.title,
      company: job.company,
      deadline: job.deadline,
      description: job.description || "",
      location: job.location || null,
      link: job.link || null,
      createdBy: job.createdBy?.toString() || null,
      createdByName: creatorName,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      metrics: {
        appliedCount: applied.length,
        notInterestedCount: notInterested.length,
      },
      myStatus: myResponse ? myResponse.status : null,
      appliedCandidates,
    };
  });
}

//Teams response to jobs
export async function setTeamJobResponse({
  teamId,
  jobId,
  userId,
  status,
}) {
  if (!teamId) throw new Error("teamId is required");
  if (!jobId) throw new Error("jobId is required");
  if (!userId) throw new Error("userId is required");
  if (!["applied", "not_interested", "clear"].includes(status)) {
    throw new Error("Invalid status");
  }

  const db = getDb();
  const memberships = db.collection(MEMBERSHIP_COLLECTION);
  const jobs = db.collection("teamJobs");

  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);
  const jobObjectId =
    jobId instanceof ObjectId ? jobId : new ObjectId(jobId);

  // Ensure user is a member of this team
  const membership = await memberships.findOne({
    teamId: teamObjectId,
    userId: userId.toString(),
    status: "active",
  });

  if (!membership) {
    const err = new Error("Team not found or access denied.");
    err.code = "FORBIDDEN";
    throw err;
  }

  const job = await jobs.findOne({
    _id: jobObjectId,
    teamId: teamObjectId,
    status: "active",
  });

  if (!job) {
    const err = new Error("Job not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const now = new Date();
  const responses = Array.isArray(job.responses)
    ? [...job.responses]
    : [];

  const idx = responses.findIndex(
    (r) => r.userId === userId.toString()
  );

  if (status === "clear") {
    if (idx !== -1) {
      responses.splice(idx, 1);
    }
  } else {
    const entry = {
      userId: userId.toString(),
      status,
      updatedAt: now,
    };

    if (idx === -1) {
      responses.push(entry);
    } else {
      responses[idx] = entry;
    }
  }

  await jobs.updateOne(
    { _id: jobObjectId },
    {
      $set: {
        responses,
        updatedAt: now,
      },
    }
  );

  return {
    jobId: jobObjectId.toString(),
    myStatus: status === "clear" ? null : status,
  };
}

//Deleting team jobs
export async function deleteTeamJobSuggestion({
  teamId,
  jobId,
  userId,
}) {
  if (!teamId) throw new Error("teamId is required");
  if (!jobId) throw new Error("jobId is required");
  if (!userId) throw new Error("userId is required");

  const db = getDb();
  const jobs = db.collection("teamJobs");
  const teamObjectId =
    teamId instanceof ObjectId ? teamId : new ObjectId(teamId);
  const jobObjectId =
    jobId instanceof ObjectId ? jobId : new ObjectId(jobId);

  // Ensure caller is coach
  await requireCoach({ db, userId, teamId: teamObjectId });

  const result = await jobs.updateOne(
    { _id: jobObjectId, teamId: teamObjectId },
    {
      $set: {
        status: "removed",
        updatedAt: new Date(),
      },
    }
  );

  if (!result.matchedCount) {
    const err = new Error("Job not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  return { ok: true };
}