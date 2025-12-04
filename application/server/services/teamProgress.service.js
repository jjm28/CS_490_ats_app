// server/services/teamProgress.service.js
import { getDb } from "../db/connection.js";
import { ObjectId } from "mongodb";
import { computeProductivityOverview } from "./productivity.service.js";
import { findUserByEmail } from "./user.service.js";
import { getTeamById } from "./teams.service.js";
import { computeCompetitiveAnalysis } from "./competitiveAnalysis.service.js";


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

/**
 * 🧠 Get mentee progress summary (uses competitive-like aggregation)
 */
export async function getTeamMenteeProgress({ teamId, userId, requesterId }) {
  const db = getDb();

  // ✅ Membership check (string-based like getTeamGoals)
  const member = await isTeamMember(db, teamId, requesterId);
  if (!member) {
    console.warn(
      `[getTeamMenteeProgress] Unauthorized: user=${requesterId} not in team=${teamId}`
    );
    throw new Error("Team not found or access denied.");
  }

  // ✅ Look up the mentee by either userId or _id (string)
  const user = await db
    .collection("users")
    .findOne({ $or: [{ userId }, { _id: userId }] });

  if (!user) {
    console.warn(
      `[getTeamMenteeProgress] Mentee not found in users for userId=${userId}`
    );
    throw new Error("Mentee not found.");
  }

  // ✅ Run the same analysis used in Competitive Analysis
  const analysis = await computeCompetitiveAnalysis({
    userId,
    targetRole: user.targetRole || "swe",
    roleLevel: user.roleLevel || "entry",
  });

  // ✅ Pull this mentee’s goals for the given team
  const goals = await db
    .collection("teamGoals")
    .find({ teamId, userId })
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

  // ✅ Productivity overview (optional)
  const productivity = await computeProductivityOverview(userId);

  // ✅ Combine all sources into a unified progress payload
  return {
    mentee: {
      id: user._id || user.userId,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: user.email,
      targetRole: user.targetRole || "swe",
      roleLevel: user.roleLevel || "entry",
    },
    jobStats: {
      applicationsSent: analysis.userMetrics?.applications || 0,
      interviewsScheduled: analysis.userMetrics?.interviews || 0,
      offersReceived: analysis.userMetrics?.offers || 0,
      interviewsPerApplication:
        analysis.userMetrics?.interviewsPerApplication || 0,
      offersPerInterview: analysis.userMetrics?.offersPerInterview || 0,
    },
    productivity: analysis.userMetrics?.timeSummary || productivity,
    goals: goalStats,
    skills: analysis.skillGaps || [],
    experience: analysis.experience || {},
    peerComparisons: analysis.comparisons || [],
    recommendations: analysis.recommendations || [],
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

  // ✅ Use the same membership check pattern as other functions
  const isMember = await isTeamMember(db, teamId, requesterId);
  if (!isMember) {
    console.warn(`[getTeamInsights] Unauthorized: user=${requesterId} not in team=${teamId}`);
    throw new Error("Team not found or access denied.");
  }

  return db
    .collection("teamInsights")
    .find({ teamId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * ➕ Add a mentor insight
 */
export async function addTeamInsight({ teamId, authorId, text }) {
  const db = getDb();
  const author = await db.collection("users").findOne({ _id: authorId });

  const insight = {
    teamId,
    authorId,
    authorName: `${author?.firstName || ""} ${author?.lastName || ""}`,
    text,
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
  const goal = await db
    .collection("teamGoals")
    .findOne({ _id: goalId });

  if (!goal || !goal.milestones?.[milestoneIndex]) {
    throw new Error("Invalid goal or milestone index");
  }

  goal.milestones[milestoneIndex].completed = completed;
  goal.milestones[milestoneIndex].completedAt = new Date();

  await db
    .collection("teamGoals")
    .updateOne({ _id: goalId }, { $set: { milestones: goal.milestones } });

  return goal;
}
