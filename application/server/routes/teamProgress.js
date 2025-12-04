// routes/team-progress.js
import express from "express";
import { ObjectId } from "mongodb";
import {getDb} from "../db/connection.js"
import { verifyJWT } from "../middleware/auth.js";
import {
  getTeamMenteeProgress,
  getTeamGoals,
  getTeamInsights,
  addTeamGoal,
  addTeamInsight,
  updateGoalMilestone,
} from "../services/teamProgress.service.js";

const router = express.Router();

/**
 * Middleware:
 *  - Supports x-dev-user-id for development
 *  - Falls back to JWT authentication
 */
router.use((req, res, next) => {
  const devId = req.headers["x-dev-user-id"];
  if (devId) {
    req.user = { _id: devId };
    return next();
  }
  verifyJWT(req, res, next);
});

/**
 * Helper to extract a normalized user ID
 */
function getUserId(req) {
  const u = req.user || {};
  return (
    u.userId?.toString() ||
    u._id?.toString() ||
    u.id?.toString() ||
    req.headers["x-dev-user-id"]?.toString() ||
    null
  );
}

/**
 * =============================
 * GET /api/teams/:teamId/progress/:userId
 * → Pull mentee progress summary (goals + productivity)
 * =============================
 */
router.get("/:teamId/progress/:userId", async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

    const result = await getTeamMenteeProgress({ teamId, userId, requesterId });
    return res.json(result);
  } catch (err) {
    console.error("Error in GET /team-progress/:userId:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to fetch progress summary" });
  }
});

/**
 * =============================
 * GET /api/teams/:teamId/goals
 * → Retrieve all team goals and milestones
 * =============================
 */
router.get("/:teamId/goals", async (req, res) => {
  try {
    const { teamId } = req.params;
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

    const goals = await getTeamGoals({ teamId, requesterId });
    return res.json(goals);
  } catch (err) {
    console.error("Error in GET /team-progress/goals:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to fetch team goals" });
  }
});

/**
 * =============================
 * POST /api/teams/:teamId/goals
 * → Add new team goal (mentor use)
 * =============================
 */
router.post("/:teamId/goals", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { title, description, milestones, userId } = req.body;
    const creatorId = getUserId(req);
    if (!creatorId) return res.status(401).json({ error: "Unauthorized" });

    const goal = await addTeamGoal({
      teamId,
      creatorId,
      title,
      description,
      milestones,
      userId,
    });

    return res.json(goal);
  } catch (err) {
    console.error("Error in POST /team-progress/goals:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to create new goal" });
  }
});

/**
 * =============================
 * PATCH /api/teams/:teamId/goals/:goalId/milestones/:index
 * → Mark milestone complete/incomplete
 * =============================
 */
router.patch("/:teamId/goals/:goalId/milestones/:index", async (req, res) => {
  try {
    const { goalId, index } = req.params;
    const { completed } = req.body;

    const updatedGoal = await updateGoalMilestone({
      goalId,
      milestoneIndex: parseInt(index, 10),
      completed: Boolean(completed),
    });

    return res.json(updatedGoal);
  } catch (err) {
    console.error("Error in PATCH /team-progress/milestone:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to update milestone" });
  }
});

/**
 * =============================
 * GET /api/teams/:teamId/insights
 * → Get all mentor insights for a team
 * =============================
 */
router.get("/:teamId/insights", async (req, res) => {
  try {
    const { teamId } = req.params;
    const requesterId = getUserId(req);
    if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

    const insights = await getTeamInsights({ teamId, requesterId });
    return res.json(insights);
  } catch (err) {
    console.error("Error in GET /team-progress/insights:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to fetch team insights" });
  }
});

/**
 * =============================
 * POST /api/teams/:teamId/insights
 * → Add a new insight (mentor)
 * =============================
 */
router.post("/:teamId/insights", async (req, res) => {
  try {
    const { teamId } = req.params;
    const { text } = req.body;
    const authorId = getUserId(req);
    if (!authorId) return res.status(401).json({ error: "Unauthorized" });

    const insight = await addTeamInsight({ teamId, authorId, text });
    return res.json(insight);
  } catch (err) {
    console.error("Error in POST /team-progress/insights:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to add team insight" });
  }
});

export default router;
