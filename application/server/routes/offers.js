// server/routes/offers.js
import express from "express";
import Jobs from "../models/jobs.js";
import { verifyJWT } from "../middleware/auth.js";


import {
  saveComparisonSnapshot,
  listComparisonSnapshots,
  getComparisonSnapshot,
  deleteComparisonSnapshot,
  buildComparison,
  GenerateOfferCareerProjection
} from "../services/offerComparison.service.js";






const router = express.Router();

// Match the jobs router auth behavior (dev header bypass, else JWT) :contentReference[oaicite:2]{index=2}
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
 * GET /api/offers?archived=false|true
 * Returns jobs with status="offer" (your canonical “offers”).
 */
router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const archived = String(req.query.archived) === "true";

    const query = {
      userId,
      status: "offer",
      ...(archived ? { archived: true } : { archived: { $ne: true } }),
    };

    const offers = await Jobs.find(query).sort({ updatedAt: -1 }).lean();
    return res.json({ data: offers });
  } catch (err) {
    console.error("GET /offers failed:", err);
    return res.status(500).json({ error: "Failed to load offers" });
  }
});

/**
 * PUT /api/offers/:jobId/comp
 * Update compensation fields on the Job itself (simple, uses existing fields).
 * Body: { finalSalary, salaryBonus, salaryEquity, benefitsValue, location, workMode }
 */
router.put("/:jobId/comp", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { jobId } = req.params;
    const {
      finalSalary,
      salaryBonus,
      salaryEquity,
      benefitsValue,
      location,
      workMode,
    } = req.body || {};

    const updated = await Jobs.findOneAndUpdate(
      { _id: jobId, userId, status: "offer" },
      {
        $set: {
          ...(finalSalary != null ? { finalSalary: Number(finalSalary) } : {}),
          ...(salaryBonus != null ? { salaryBonus: Number(salaryBonus) } : {}),
          ...(salaryEquity != null ? { salaryEquity: Number(salaryEquity) } : {}),
          ...(benefitsValue != null ? { benefitsValue: Number(benefitsValue) } : {}),
          ...(location != null ? { location: String(location) } : {}),
          ...(workMode != null ? { workMode: String(workMode) } : {}),
        },
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Offer job not found" });
    return res.json(updated);
  } catch (err) {
    console.error("PUT /offers/:jobId/comp failed:", err);
    return res.status(500).json({ error: "Failed to update offer comp" });
  }
});

/**
 * POST /api/offers/compare
 * Body:
 * {
 *   jobIds: [id1, id2, ...],
 *   baselineColIndex: 100,
 *   colIndexByJobId: { [id]: number },
 *   scenarioByJobId: { [id]: { salaryIncreasePct, bonusIncreasePct, equityIncreasePct, benefitsIncreasePct } },
 *   ratingsByJobId: { [id]: { cultureFit, growth, workLifeBalance, remotePolicy } },
 *   weights: { financialWeight, cultureFitWeight, growthWeight, workLifeBalanceWeight, remotePolicyWeight }
 * }
 */
router.post("/compare", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { jobIds = [] } = req.body || {};
    if (!Array.isArray(jobIds) || jobIds.length < 2) {
      return res.status(400).json({ error: "Provide at least two offer jobIds to compare." });
    }

    const jobs = await Jobs.find({
      _id: { $in: jobIds },
      userId,
      status: "offer",
    }).lean();

    if (jobs.length < 2) {
      return res.status(400).json({ error: "Could not load at least two offer jobs for comparison." });
    }

    const result = buildComparison(jobs, req.body || {});
    return res.json(result);
  } catch (err) {
    console.error("POST /offers/compare failed:", err);
    return res.status(500).json({ error: "Failed to compare offers" });
  }
});

/**
 * POST /api/offers/:jobId/archive
 * Body: { reason: string }
 */
router.post("/:jobId/archive", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { jobId } = req.params;
    const reason = String(req.body?.reason || "").trim();

    const updated = await Jobs.findOneAndUpdate(
      { _id: jobId, userId, status: "offer" },
      { $set: { archived: true, archiveReason: reason || "Declined", archivedAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Offer job not found" });
    return res.json(updated);
  } catch (err) {
    console.error("POST /offers/:jobId/archive failed:", err);
    return res.status(500).json({ error: "Failed to archive offer" });
  }
});

// GET /api/offers/comparisons - list saved comparisons
router.get("/comparisons", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const rows = await listComparisonSnapshots(userId);
    res.json({ data: rows });
  } catch (err) {
    console.error("GET /offers/comparisons failed:", err);
    res.status(500).json({ error: "Failed to load saved comparisons" });
  }
});

// POST /api/offers/comparisons - save a new comparison
router.post("/comparisons", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { name, jobIds, inputs, result } = req.body || {};
if (!Array.isArray(jobIds) || jobIds.length < 2)
  return res.status(400).json({ error: "At least two jobIds required" });
if (!result) return res.status(400).json({ error: "Missing comparison result" });

const doc = await saveComparisonSnapshot({ userId, name, jobIds, inputs, result });
    res.json({ data: doc });
  } catch (err) {
    console.error("POST /offers/comparisons failed:", err);
    res.status(500).json({ error: "Failed to save comparison" });
  }
});

// GET /api/offers/comparisons/:id - fetch a saved comparison
router.get("/comparisons/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const doc = await getComparisonSnapshot(userId, req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ data: doc });
  } catch (err) {
    console.error("GET /offers/comparisons/:id failed:", err);
    res.status(500).json({ error: "Failed to load comparison" });
  }
});

// DELETE /api/offers/comparisons/:id - delete a saved comparison
router.delete("/comparisons/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const deleted = await deleteComparisonSnapshot(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /offers/comparisons/:id failed:", err);
    res.status(500).json({ error: "Failed to delete comparison" });
  }
});

router.post("/career-projection", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { jobIds = [], inputs = {} } = req.body || {};
    if (!Array.isArray(jobIds) || jobIds.length < 2) {
      return res.status(400).json({ error: "Provide at least two offer jobIds to project." });
    }

    const jobs = await Jobs.find({
      _id: { $in: jobIds },
      userId,
      status: "offer",
    }).lean();

    if (jobs.length < 2) {
      return res.status(400).json({ error: "Could not load at least two offer jobs for projection." });
    }

    const data = await GenerateOfferCareerProjection(jobs, inputs);
    return res.json({ data });
  } catch (err) {
    console.error("POST /offers/career-projection failed:", err);
    return res.status(500).json({ error: "Failed to generate career projection" });
  }
});

export default router;
