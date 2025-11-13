import express from "express";
import { getInterviewInsights } from "../services/interview.service.js";
import { getJob } from "../services/salary.service.js"; // or wherever your getJob function lives

const router = express.Router();

// GET /api/interview-insights/:jobId
router.get("/:jobId", async (req, res) => {
  try {
    const userId = req.user?._id || "default-user";
    const jobId = req.params.jobId;

    // ✅ Fetch the job from your DB
    const job = await getJob({ userId, id: jobId });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const company = job.company || "Unknown Company";
    console.log("💡 Fetching interview insights for:", company);

    // ✅ Generate or fetch Gemini insights
    const result = await getInterviewInsights(company);

    if (!result) {
      return res.status(404).json({ error: "No insights found" });
    }

    res.json(result);
  } catch (err) {
    console.error("❌ Interview insights error:", err);
    res.status(500).json({ error: "Failed to fetch interview insights" });
  }
});

export default router;
