import express from "express";
import { computeSuccessAnalysis } from "../services/successAnalysis.service.js";

const router = express.Router();

// GET /api/success-analysis
import { verifyJWT } from "../middleware/auth.js";

router.get("/", verifyJWT, async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await computeSuccessAnalysis(userId.toString());
    res.json(result);

  } catch (err) {
    console.error("Failed to compute success analysis:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;