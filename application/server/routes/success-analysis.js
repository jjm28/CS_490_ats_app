import express from "express";
import { computeSuccessAnalysis } from "../services/successAnalysis.service.js";

const router = express.Router();

// GET /api/success-analysis
router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-dev-user-id"];
    if (!userId) {
      return res.status(400).json({ error: "Missing x-dev-user-id header" });
    }

    const result = await computeSuccessAnalysis(userId);
    res.json(result);

  } catch (err) {
    console.error("Failed to compute success analysis:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;