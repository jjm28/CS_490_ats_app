// routes/jobSearchSharing.routes.js
import express from "express";
import {
  getOrCreateSharingProfile,
  updateSharingProfileSettings,listJobSearchGoals,
  createJobSearchGoal,
  addGoalProgress,
  listJobSearchMilestones,
  createJobSearchMilestone, 
  listEncouragementEvents,
  generateProgressReport,
} from "../services/jobSearchSharing.service.js";

const router = express.Router();

/**
 * GET /api/job-search/sharing?userId=...
 * Fetch the current user's sharing profile.
 */
router.get("/job-search/sharing", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const profile = await getOrCreateSharingProfile(String(userId));
    res.json(profile);
  } catch (err) {
    console.error("Error fetching sharing profile:", err);
    res.status(500).json({ error: "Server error fetching sharing profile" });
  }
});

/**
 * POST /api/job-search/sharing?userId=...
 * Create or update the user's sharing settings.
 */
router.post("/job-search/sharing", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const {
      visibilityMode,
      allowedUserIds,
      blockedUserIds,
      scopes,
      defaultReportFrequency,
    } = req.body;

    const updated = await updateSharingProfileSettings({
      ownerUserId: String(userId),
      visibilityMode,
      allowedUserIds,
      blockedUserIds,
      scopes,
      defaultReportFrequency,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating sharing profile:", err);
    res.status(500).json({ error: "Server error updating sharing profile" });
  }
});


// GET /api/job-search/goals?userId=...
router.get("/job-search/goals", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const goals = await listJobSearchGoals(String(userId));
    res.json(goals);
  } catch (err) {
    console.error("Error listing goals:", err);
    res.status(500).json({ error: "Server error listing goals" });
  }
});

// POST /api/job-search/goals?userId=...
router.post("/job-search/goals", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { title, description, targetValue, unit, deadline } = req.body;

    const goal = await createJobSearchGoal({
      ownerUserId: String(userId),
      title,
      description,
      targetValue,
      unit,
      deadline,
    });

    res.json(goal);
  } catch (err) {
    console.error("Error creating goal:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error creating goal",
    });
  }
});

// POST /api/job-search/goals/:goalId/progress?userId=...
router.post("/job-search/goals/:goalId/progress", async (req, res) => {
  try {
    const { userId } = req.query;
    const { goalId } = req.params;
    const { delta, note } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const result = await addGoalProgress({
      ownerUserId: String(userId),
      goalId,
      delta,
      note,
    });

    res.json(result);
  } catch (err) {
    console.error("Error adding goal progress:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error adding goal progress",
    });
  }
});

// ----- MILESTONES -----

// GET /api/job-search/milestones?userId=...
router.get("/job-search/milestones", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const milestones = await listJobSearchMilestones(String(userId));
    res.json(milestones);
  } catch (err) {
    console.error("Error listing milestones:", err);
    res.status(500).json({ error: "Server error listing milestones" });
  }
});

// POST /api/job-search/milestones?userId=...
router.post("/job-search/milestones", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { title, description, achievedAt, relatedJobId, type } = req.body;

    const milestone = await createJobSearchMilestone({
      ownerUserId: String(userId),
      title,
      description,
      achievedAt,
      relatedJobId,
      type,
    });

    res.json(milestone);
  } catch (err) {
    console.error("Error creating milestone:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error creating milestone",
    });
  }
});

router.post("/job-search/reports/generate", async (req, res) => {
  try {
    const { ownerId, viewerId } = req.query;
    const { rangeFrom, rangeTo } = req.body || {};

    if (!ownerId) {
      return res.status(400).json({ error: "ownerId is required" });
    }

    const report = await generateProgressReport({
      ownerUserId: String(ownerId),
      viewerUserId: viewerId ? String(viewerId) : undefined,
      rangeFrom,
      rangeTo,
    });

    res.json(report);
  } catch (err) {
    console.error("Error generating progress report:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error generating progress report",
    });
  }
});
/**
 * GET /api/job-search/encouragement?userId=...
 * List recent encouragement events for a user.
 */
router.get("/job-search/encouragement", async (req, res) => {
  try {
    const { userId, limit } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const events = await listEncouragementEvents(
      String(userId),
      limit ? Number(limit) : 20
    );

    res.json(events);
  } catch (err) {
    console.error("Error listing encouragement events:", err);
    res.status(500).json({ error: "Server error listing encouragement events" });
  }
});

export default router;

