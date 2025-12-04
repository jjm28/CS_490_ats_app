// routes/success-overview.js
import express from "express";
import { computeSuccessAnalysis } from "../services/successAnalysis.service.js";
import { computeSuccessPatterns } from "../services/successPatterns.service.js";
import { computeCompetitiveAnalysis } from "../services/competitiveAnalysis.service.js";
import { getUpcomingInterviewPredictions } from "../services/interviewSuccessPrediction.service.js";
import { saveDailySnapshot } from "../services/successSnapshot.service.js";

const router = express.Router();

// simple dev/JWT hybrid — swap in your verifyJWT if you prefer
router.use((req, res, next) => {
  if (req.headers["x-dev-user-id"]) {
    req.user = { _id: req.headers["x-dev-user-id"] };
    return next();
  }
  verifyJWT(req, res, next);
});

function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();
  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

/**
 * GET /api/success/overview
 * Query:
 *   includePredictions=true|false
 *   snapshot=true|false
 */
router.get("/overview", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const includePredictions = String(req.query.includePredictions || "false") === "true";
    const doSnapshot = String(req.query.snapshot || "false") === "true";

    const [analysis, patterns, competitive, predictions] = await Promise.all([
      computeSuccessAnalysis(userId),
      computeSuccessPatterns(userId),
      computeCompetitiveAnalysis({ userId }),
      includePredictions ? getUpcomingInterviewPredictions(userId) : Promise.resolve([]),
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      analysis,
      patterns,
      competitive,
      predictions,
    };

    if (doSnapshot) {
      await saveDailySnapshot(userId, payload);
    }

    return res.json(payload);
  } catch (err) {
    console.error("Failed to build success overview:", err);
    return res
      .status(500)
      .json({ error: err?.message || "Failed to build success overview" });
  }
});


export default router;
