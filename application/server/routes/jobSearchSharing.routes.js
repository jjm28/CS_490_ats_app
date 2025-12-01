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
  logPartnerEngagement,
  getPartnerEngagementSummary, getMotivationStats,getAccountabilityInsights,listDiscussionMessages,
  postDiscussionMessage,
  reactToDiscussionMessage,
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


/**
 * POST /api/job-search/engagement/log
 *
 * Log an accountability partner engagement event.
 *
 * Body:
 *   ownerUserId   - whose job search this is
 *   partnerUserId - the partner who is engaging
 *   type          - "view_progress" | "view_report" | "view_milestones" | "encouragement_reaction"
 *   contextId?    - optional, e.g. reportId or goalId
 */
router.post("/job-search/engagement/log", async (req, res) => {
  try {
    const { ownerUserId, partnerUserId, type, contextId } = req.body || {};

    if (!ownerUserId || !partnerUserId || !type) {
      return res.status(400).json({
        error: "ownerUserId, partnerUserId, and type are required",
      });
    }

    const event = await logPartnerEngagement({
      ownerUserId: String(ownerUserId),
      partnerUserId: String(partnerUserId),
      type,
      contextId,
    });

    res.json(event);
  } catch (err) {
    console.error("Error logging partner engagement:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error logging partner engagement",
    });
  }
});

/**
 * GET /api/job-search/engagement/summary?ownerId=...&sinceDays=30
 *
 * Returns aggregated partner engagement + simple effectiveness stats.
 */
router.get("/job-search/engagement/summary", async (req, res) => {
  try {
    const { ownerId, sinceDays } = req.query;

    if (!ownerId) {
      return res.status(400).json({ error: "ownerId is required" });
    }

    const summary = await getPartnerEngagementSummary({
      ownerUserId: String(ownerId),
      sinceDays: sinceDays ? Number(sinceDays) : 30,
    });

    res.json(summary);
  } catch (err) {
    console.error("Error getting partner engagement summary:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error getting partner engagement summary",
    });
  }
});

/**
 * GET /api/job-search/motivation?ownerId=...&viewerId=...&sinceDays=14
 *
 * Returns visual/motivation stats for job search.
 */
router.get("/job-search/motivation", async (req, res) => {
  try {
    const { ownerId, viewerId, sinceDays } = req.query;

    if (!ownerId) {
      return res.status(400).json({ error: "ownerId is required" });
    }

    const stats = await getMotivationStats({
      ownerUserId: String(ownerId),
      viewerUserId: viewerId ? String(viewerId) : undefined,
      sinceDays: sinceDays ? Number(sinceDays) : 14,
    });

    res.json(stats);
  } catch (err) {
    console.error("Error getting motivation stats:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error getting motivation stats",
    });
  }
});

/**
 * GET /api/job-search/insights?ownerId=...&sinceWeeks=8
 *
 * Returns insights on accountability impact on job search success.
 */
router.get("/job-search/insights", async (req, res) => {
  try {
    const { ownerId, sinceWeeks } = req.query;

    if (!ownerId) {
      return res.status(400).json({ error: "ownerId is required" });
    }

    const insights = await getAccountabilityInsights({
      ownerUserId: String(ownerId),
      sinceWeeks: sinceWeeks ? Number(sinceWeeks) : 8,
    });

    res.json(insights);
  } catch (err) {
    console.error("Error getting accountability insights:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error getting accountability insights",
    });
  }
});

/**
 * GET /api/job-search/discussion?ownerId=...&viewerId=...&limit=50
 */
router.get("/job-search/discussion", async (req, res) => {
  try {
    const { ownerId, viewerId, limit } = req.query;

    if (!ownerId || !viewerId) {
      return res
        .status(400)
        .json({ error: "ownerId and viewerId are required" });
    }

    const messages = await listDiscussionMessages({
      ownerUserId: String(ownerId),
      viewerUserId: String(viewerId),
      limit: limit ? Number(limit) : 50,
    });

    res.json(messages);
  } catch (err) {
    console.error("Error listing discussion messages:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error listing discussion messages",
    });
  }
});

/**
 * POST /api/job-search/discussion
 * Body: { ownerUserId, senderUserId, text, contextType?, contextId? }
 */
router.post("/job-search/discussion", async (req, res) => {
  try {
    const { ownerUserId, senderUserId, text, contextType, contextId } =
      req.body || {};

    if (!ownerUserId || !senderUserId) {
      return res
        .status(400)
        .json({ error: "ownerUserId and senderUserId are required" });
    }

    const msg = await postDiscussionMessage({
      ownerUserId: String(ownerUserId),
      senderUserId: String(senderUserId),
      text,
      contextType,
      contextId,
    });

    res.json(msg);
  } catch (err) {
    console.error("Error posting discussion message:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error posting discussion message",
    });
  }
});

/**
 * POST /api/job-search/discussion/:messageId/react
 * Body: { userId, type }
 */
router.post("/job-search/discussion/:messageId/react", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId, type } = req.body || {};

    if (!messageId || !userId || !type) {
      return res
        .status(400)
        .json({ error: "messageId, userId, and type are required" });
    }

    const msg = await reactToDiscussionMessage({
      messageId: String(messageId),
      userId: String(userId),
      type,
    });

    res.json(msg);
  } catch (err) {
    console.error("Error reacting to discussion message:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Server error reacting to discussion message",
    });
  }
});

export default router;

