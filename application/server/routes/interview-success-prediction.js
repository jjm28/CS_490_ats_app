// routes/interview-success-prediction.js
import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import {
  calculateSuccessProbability,
  getUpcomingInterviewPredictions,
  updatePredictionOutcome,
  getPredictionAccuracyStats,
  markRecommendationCompleted
} from "../services/interviewSuccessPrediction.service.js";

const router = express.Router();

/**
 * Auth middleware - supports both dev mode and JWT
 */
router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

/**
 * Helper to get user ID from request
 */
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

/**
 * GET /api/interview-predictions/upcoming
 * Get success probability predictions for all upcoming interviews
 */
router.get("/upcoming", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const predictions = await getUpcomingInterviewPredictions(userId);
    res.json(predictions);
    
  } catch (err) {
    console.error("❌ Error fetching upcoming predictions:", err);
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

/**
 * GET /api/interview-predictions/:interviewId
 * Get or calculate success probability for a specific interview
 * Query params:
 *   - jobId: required
 */
router.get("/:interviewId", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const { interviewId } = req.params;
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId query parameter" });
    }

    const prediction = await calculateSuccessProbability(userId, jobId, interviewId);
    res.json(prediction);
    
  } catch (err) {
    console.error("❌ Error calculating prediction:", err);
    res.status(500).json({ error: err.message || "Failed to calculate prediction" });
  }
});

/**
 * POST /api/interview-predictions/:interviewId/recalculate
 * Force recalculation of success probability
 * Query params:
 *   - jobId: required
 */
router.post("/:interviewId/recalculate", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const { interviewId } = req.params;
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId query parameter" });
    }

    const prediction = await calculateSuccessProbability(userId, jobId, interviewId);
    res.json(prediction);
    
  } catch (err) {
    console.error("❌ Error recalculating prediction:", err);
    res.status(500).json({ error: err.message || "Failed to recalculate prediction" });
  }
});

/**
 * PUT /api/interview-predictions/:predictionId/outcome
 * Update prediction with actual interview outcome
 * Body:
 *   - actualOutcome: 'passed' | 'rejected' | 'offer'
 */
router.put("/:predictionId/outcome", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const { predictionId } = req.params;
    const { actualOutcome } = req.body;

    if (!actualOutcome || !['passed', 'rejected', 'offer'].includes(actualOutcome)) {
      return res.status(400).json({ 
        error: "Invalid actualOutcome. Must be 'passed', 'rejected', or 'offer'" 
      });
    }

    const prediction = await updatePredictionOutcome(predictionId, actualOutcome);
    res.json(prediction);
    
  } catch (err) {
    console.error("❌ Error updating outcome:", err);
    res.status(500).json({ error: err.message || "Failed to update outcome" });
  }
});

/**
 * GET /api/interview-predictions/accuracy/stats
 * Get prediction accuracy statistics for the user
 */
router.get("/accuracy/stats", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const stats = await getPredictionAccuracyStats(userId);
    res.json(stats);
    
  } catch (err) {
    console.error("❌ Error fetching accuracy stats:", err);
    res.status(500).json({ error: "Failed to fetch accuracy stats" });
  }
});

/**
 * PUT /api/interview-predictions/:predictionId/recommendations/:index/complete
 * Mark a recommendation as completed
 */
router.put("/:predictionId/recommendations/:index/complete", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const { predictionId, index } = req.params;
    const recommendationIndex = parseInt(index);

    if (isNaN(recommendationIndex) || recommendationIndex < 0) {
      return res.status(400).json({ error: "Invalid recommendation index" });
    }

    const prediction = await markRecommendationCompleted(predictionId, recommendationIndex);
    res.json(prediction);
    
  } catch (err) {
    console.error("❌ Error marking recommendation complete:", err);
    res.status(500).json({ error: err.message || "Failed to mark recommendation complete" });
  }
});

export default router;