// server/services/teamProgress.service.js
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { computeProductivityOverview } from "./productivity.service.js";
import { findUserByEmail } from "./user.service.js";
import { getTeamById } from "./teams.service.js";
import { computeCompetitiveAnalysis } from "./competitiveAnalysis.service.js";
import { getJobStats } from "./jobs.service.js";


function toObjectId(id) {
  if (!id) return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

async function isTeamMember(db, teamId, requesterId) {
  const teamObjId = toObjectId(teamId);
  const userObjId = toObjectId(requesterId);

  const query = {
    teamId: { $in: [teamObjId, teamId].filter(Boolean) },
    userId: { $in: [requesterId, userObjId].filter(Boolean) },
    status: "active",
  };

  return db.collection("teamMemberships").findOne(query);
}

function roleFlags(membership) {
  const roles = membership?.roles || [];
  const isCoach = roles.includes("admin") || roles.includes("mentor");
  const isCandidateOnly = roles.includes("candidate") && !isCoach;
  return { roles, isCoach, isCandidateOnly };
}



/**
 * 🧠 Get mentee progress summary (uses competitive-like aggregation)
 */
export async function getTeamMenteeProgress({ teamId, userId, requesterId }) {
  const db = getDb();

  // ✅ 1) Verify requester belongs to this team (handles string/ObjectId)
  const membership = await isTeamMember(db, teamId, requesterId);
  if (!membership) {
    console.warn(
      `[getTeamMenteeProgress] Unauthorized: user=${requesterId} not in team=${teamId}`
    );
    throw new Error("Team not found or access denied.");
  }

  // Normalize IDs
  const userIdStr = userId?.toString();
  const userObjId = toObjectId(userIdStr);
  const teamObjId = toObjectId(teamId);

  // ✅ 2) Fetch the mentee user
  //    Try string _id, then ObjectId _id, then a userId field if you ever use it.
  const user = await db.collection("users").findOne({
    $or: [
      { _id: userIdStr },
      ...(userObjId ? [{ _id: userObjId }] : []),
      { userId: userIdStr },
    ],
  });

  if (!user) {
    console.warn(
      "[getTeamMenteeProgress] No user found for id:",
      userIdStr
    );
    throw new Error("Mentee not found for this team.");
  }

  const displayName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.fullName ||
    user.name ||
    user.email ||
    "Candidate";

  // ✅ 3) Load goals for this mentee
  const goals = await db
    .collection("teamGoals")
    .find({
      teamId: { $in: [teamObjId, teamId].filter(Boolean) },
      userId: { $in: [userIdStr, userObjId].filter(Boolean) },
    })
    .toArray();

  const goalStats = {
    totalGoals: goals.length,
    completedGoals: goals.filter((g) => g.status === "completed").length,
    totalMilestones: goals.reduce(
      (sum, g) => sum + (g.milestones?.length || 0),
      0
    ),
    completedMilestones: goals.reduce(
      (sum, g) =>
        sum + (g.milestones?.filter((m) => m.completed)?.length || 0),
      0
    ),
  };

  // ✅ 4) Pull competitive, productivity, and job stats in parallel
  const [competitive, productivityData, jobStatsRaw] = await Promise.all([
    computeCompetitiveAnalysis({
      userId: userIdStr,
      targetRole: user.targetRole || "swe",
      roleLevel: user.roleLevel || "entry",
    }).catch((err) => {
      console.warn("Competitive analysis unavailable:", err.message);
      return null;
    }),
    computeProductivityOverview(userIdStr).catch(() => null),
    getJobStats(userIdStr).catch((err) => {
      console.warn("Job stats unavailable:", err.message);
      return {};
    }),
  ]);

  // ✅ 5) Normalize productivity (same as before)
  const productivity =
    competitive?.userMetrics?.timeSummary || productivityData || {};

  // ✅ 6) Normalize jobStats (same as before)
  const jobStats = {
    applicationsSent: jobStatsRaw?.applicationsSent ?? 0,
    interviewsScheduled: jobStatsRaw?.interviewsScheduled ?? 0,
    offersReceived: jobStatsRaw?.offersReceived ?? 0,
    overallConversion:
      jobStatsRaw?.overallConversion ??
      jobStatsRaw?.conversion?.applyToOffer ??
      0,
    responseRate: jobStatsRaw?.responseRate ?? 0,
    averageResponseTimeDisplay:
      jobStatsRaw?.averageResponseTimeDisplay || "—",
  };

  // ✅ 7) Final payload for the frontend
  return {
    mentee: {
      id: userIdStr,
      name: displayName,
      email: user.email,
    },
    jobStats,
    productivity,
    goals: goalStats,
  };
}

/**
 * 🎯 Get all goals for a team
 */
export async function getTeamGoals({ teamId, requesterId }) {
  const db = getDb();

  const isMember = await isTeamMember(db, teamId, requesterId);
  if (!isMember) {
    console.warn(`[getTeamGoals] Unauthorized: user=${requesterId} not in team=${teamId}`);
    throw new Error("Team not found or access denied.");
  }

  return db.collection("teamGoals").find({ teamId }).toArray();
}

/**
 * 💬 Get all insights for a team
 */
export async function getTeamInsights({ teamId, requesterId }) {
  const db = getDb();

  // Check membership
  const membership = await isTeamMember(db, teamId, requesterId);
  if (!membership) {
    console.warn(
      `[getTeamInsights] Unauthorized: user=${requesterId} not in team=${teamId}`
    );
    throw new Error("Team not found or access denied.");
  }

  const { isCoach } = roleFlags(membership);
  const teamObjId = toObjectId(teamId);

  // Load active team members
  const memberships = await db
    .collection("teamMemberships")
    .find({
      teamId: { $in: [teamObjId, teamId].filter(Boolean) },
      status: "active",
    })
    .toArray();

  const memberIds = memberships.map(
    (m) => m.userId?.toString?.() || m.userId
  );

  // Load user docs so we can show names in the dropdown
  const users = await db
    .collection("users")
    .find({
      $or: [
        { _id: { $in: memberIds } },
        {
          _id: {
            $in: memberIds
              .map((id) => toObjectId(id))
              .filter((id) => id !== null),
          },
        },
      ],
    })
    .toArray();

  const nameForUser = (id) => {
    const u = users.find(
      (uu) => uu._id?.toString?.() === id || uu._id === id
    );
    if (!u) return "Member";
    const full =
      `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.fullName;
    return full || u.email || "Member";
  };

  const members = memberIds.map((id) => ({
    id,
    name: nameForUser(id),
  }));

  const requesterStr = requesterId?.toString();
  const requesterObjId = toObjectId(requesterStr);

  const baseFilter = { teamId };

  // Coaches see everything; candidates only see team-wide + their own personals
  const visibleFilter = isCoach
    ? baseFilter
    : {
        $or: [
          { ...baseFilter, scope: "team" },
          { ...baseFilter, scope: { $exists: false } }, // old records as team-wide
          {
            ...baseFilter,
            scope: "personal",
            recipientIds: {
              $in: [requesterStr, requesterObjId].filter(Boolean),
            },
          },
        ],
      };

  const allInsights = await db
    .collection("teamInsights")
    .find(visibleFilter)
    .sort({ createdAt: -1 })
    .toArray();

  const normalized = allInsights.map((i) => ({
    ...i,
    scope: i.scope || "team",
    recipientIds: Array.isArray(i.recipientIds) ? i.recipientIds : [],
  }));

  const teamInsights = normalized.filter((i) => i.scope !== "personal");
  const personalInsights = normalized.filter((i) => i.scope === "personal");

  const membersForPicker = members.filter(
    (m) =>
      m.id !== requesterStr && m.id !== requesterObjId?.toString?.()
  );

  return {
    teamInsights,
    personalInsights,
    members: membersForPicker,
    canPost: !!isCoach,
  };
}

/**
 * ➕ Add a mentor insight
 */
export async function addTeamInsight({
  teamId,
  authorId,
  text,
  scope = "team",
  recipientIds = [],
}) {
  const db = getDb();

  // Author must be on the team and a coach/admin
  const membership = await isTeamMember(db, teamId, authorId);
  if (!membership) {
    throw new Error("Team not found or access denied.");
  }
  const { isCoach } = roleFlags(membership);
  if (!isCoach) {
    throw new Error("Only mentors/admins can post insights.");
  }

  const author = await db.collection("users").findOne({ _id: authorId });

  let recipients = [];
  if (scope === "personal") {
    const teamObjId = toObjectId(teamId);

    const activeMemberships = await db
      .collection("teamMemberships")
      .find({
        teamId: { $in: [teamObjId, teamId].filter(Boolean) },
        status: "active",
      })
      .toArray();

    const activeIds = new Set(
      activeMemberships.map((m) => m.userId?.toString?.() || m.userId)
    );

    const rawRecipients = Array.isArray(recipientIds) ? recipientIds : [];

    recipients = rawRecipients
      .map((r) => r?.toString?.() || r)
      .filter(Boolean)
      .filter((r) => r !== authorId) // no sending to self
      .filter((r) => activeIds.has(r)); // must be team member

    if (recipients.length === 0) {
      throw new Error("Select at least one valid team member recipient.");
    }
  }

  const insight = {
    teamId,
    authorId,
    authorName:
      `${author?.firstName || ""} ${author?.lastName || ""}`.trim() ||
      author?.email ||
      "Coach",
    text,
    scope: scope === "personal" ? "personal" : "team",
    recipientIds: scope === "personal" ? recipients : [],
    createdAt: new Date(),
  };

  await db.collection("teamInsights").insertOne(insight);
  return insight;
}

/**
 * 🧩 Add a new team goal
 */
export async function addTeamGoal({
  teamId,
  creatorId,
  title,
  description,
  milestones,
  userId,
}) {
  const db = getDb();

  const goal = {
    teamId,
    creatorId,
    userId,
    title,
    description,
    milestones: milestones || [],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("teamGoals").insertOne(goal);
  return goal;
}

/**
 * ✅ Mark a milestone complete
 */
export async function updateGoalMilestone({
  goalId,
  milestoneIndex,
  completed,
}) {
  const db = getDb();
  const goalObjId = toObjectId(goalId) || goalId;

  const goal = await db.collection("teamGoals").findOne({ _id: goalObjId });

  if (!goal || !goal.milestones?.[milestoneIndex]) {
    throw new Error("Invalid goal or milestone index");
  }

  goal.milestones[milestoneIndex].completed = completed;
  goal.milestones[milestoneIndex].completedAt = new Date();

  await db
    .collection("teamGoals")
    .updateOne({ _id: goalObjId }, { $set: { milestones: goal.milestones } });

  return goal;
}

export async function markGoalComplete({
  teamId,
  goalId,
  requesterId,
  completed,
  comment,
}) {
  const db = getDb();

  // Ensure requester is on the team
  const membership = await isTeamMember(db, teamId, requesterId);
  if (!membership) {
    console.warn(
      `[markGoalComplete] Unauthorized: user=${requesterId} not in team=${teamId}`
    );
    throw new Error("Team not found or access denied.");
  }

  const roles = membership.roles || [];
  const isCoach = roles.includes("admin") || roles.includes("mentor");
  const isCandidateOnly = roles.includes("candidate") && !isCoach;

  const goalObjId = toObjectId(goalId) || goalId;
  const goal = await db
    .collection("teamGoals")
    .findOne({ _id: goalObjId, teamId });

  if (!goal) {
    throw new Error("Goal not found.");
  }

  // If candidate, only allow completing their own goal
  if (isCandidateOnly) {
    const goalUserId = goal.userId?.toString?.() || goal.userId;
    if (goalUserId && goalUserId !== requesterId.toString()) {
      throw new Error("You can only complete your own goals.");
    }
  }

  const now = new Date();
  const newStatus = completed ? "completed" : "active";

  const update = {
    status: newStatus,
    updatedAt: now,
  };

  if (completed) {
    update.completedAt = now;
    if (comment) {
      update.completionComment = comment;
    }
  } else if (comment) {
    // allow updating comment even if toggling back to active
    update.completionComment = comment;
  }

  await db
    .collection("teamGoals")
    .updateOne({ _id: goalObjId }, { $set: update });

  const updated = await db.collection("teamGoals").findOne({ _id: goalObjId });
  return updated;
}
