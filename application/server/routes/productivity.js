// routes/productivity.js
import express from "express";
import {
  startActivitySession,
  endActivitySession,
  computeProductivityOverview,
} from "../services/productivity.service.js";

const router = express.Router();

function getUserId(req) {
  // Consistent with other routes: prefer real user, fall back to dev header
  return req.user?._id || req.user?.id || req.headers["x-dev-user-id"];
}

/**
 * POST /api/productivity/sessions/start
 * Body: { activityType, jobId?, context?, energyLevelStart? }
 */
router.post("/sessions/start", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { activityType, jobId, context, energyLevelStart } = req.body;

    if (!activityType) {
      return res
        .status(400)
        .json({ error: "activityType is required (e.g. job_search)" });
    }

    const session = await startActivitySession({
      userId: userId.toString(),
      activityType,
      jobId,
      context,
      energyLevelStart,
    });

    res.status(201).json(session);
  } catch (err) {
    console.error("Error starting activity session:", err);
    res.status(500).json({
      error: err?.message || "Failed to start activity session",
    });
  }
});

/**
 * POST /api/productivity/sessions/end
 * Body: { sessionId, energyLevelEnd? }
 */
router.post("/sessions/end", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { sessionId, energyLevelEnd } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const session = await endActivitySession({
      userId: userId.toString(),
      sessionId,
      energyLevelEnd,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (err) {
    console.error("Error ending activity session:", err);
    res.status(500).json({ error: err?.message || "Failed to end session" });
  }
});

/**
 * GET /api/productivity/overview
 * Returns aggregated productivity/time-investment analytics
 */
router.get("/overview", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const overview = await computeProductivityOverview(userId.toString());
    res.json(overview);
  } catch (err) {
    console.error("Error computing productivity overview:", err);
    res
      .status(500)
      .json({ error: err?.message || "Failed to load productivity overview" });
  }
});

export default router;
