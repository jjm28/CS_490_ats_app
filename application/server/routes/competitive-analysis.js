// routes/competitive-analysis.js

import express from "express";
import { verifyJWT } from "../middleware/auth.js";
import { computeCompetitiveAnalysis } from "../services/competitiveAnalysis.service.js";

const router = express.Router();

/**
 * Auth middleware for this router
 * - If x-dev-user-id is present, treat it as the user id (dev/testing)
 * - Otherwise, fall back to normal JWT auth (Authorization: Bearer <token>)
 *
 * This matches the pattern used in routes like jobs.js.
 */
router.use((req, res, next) => {
  const devId = req.headers["x-dev-user-id"];

  if (devId) {
    req.user = { _id: devId };
    return next();
  }

  // Will set req.user if the JWT is valid
  verifyJWT(req, res, next);
});

/**
 * Helper to normalize the user id
 */
function getUserId(req) {
  if (req.user?._id) return req.user._id.toString();
  if (req.user?.id) return req.user.id.toString();

  const dev = req.headers["x-dev-user-id"];
  return dev ? dev.toString() : null;
}

/**
 * GET /api/competitive-analysis
 *
 * Optional query params:
 *   - targetRole: "swe" | "data" | "pm" | ...
 *   - roleLevel: "entry" | "mid" | "senior" | "lead"
 *   - yearsExperience: number
 */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { targetRole, roleLevel, yearsExperience } = req.query;

    const options = {
      userId,
      targetRole: typeof targetRole === "string" ? targetRole : undefined,
      roleLevel: typeof roleLevel === "string" ? roleLevel : undefined,
      yearsOfExperience:
        typeof yearsExperience === "string" &&
        !Number.isNaN(Number(yearsExperience))
          ? Number(yearsExperience)
          : undefined,
    };

    const result = await computeCompetitiveAnalysis(options);
    return res.json(result);
  } catch (err) {
    console.error("Error in GET /api/competitive-analysis:", err);
    return res.status(500).json({
      error: err?.message || "Failed to compute competitive analysis",
    });
  }
});

export default router;
