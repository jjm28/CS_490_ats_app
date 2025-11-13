// routes/salary.js
import express from "express";
import {
  getJob,
  getSalaryResearch,
  generateLLMSummaryAndTips,
} from "../services/salary.service.js";

const router = express.Router();

// Helper to check cache expiration (e.g., 7 days)
function isCacheExpired(cachedAt, days = 7) {
  if (!cachedAt) return true;
  const age = (Date.now() - new Date(cachedAt).getTime()) / (1000 * 60 * 60 * 24);
  return age > days;
}

// ====================================
// GEMINI-ONLY SALARY RESEARCH ROUTE
// ====================================

router.get("/:jobId", async (req, res) => {
  try {
    console.log("💥 Salary route hit for job:", req.params.jobId);
    const userId = req.user?._id || "default-user";
    const jobId = req.params.jobId;

    // Get job details
    const job = await getJob({ userId, id: jobId });
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Check cached salary info
    const cached = await getSalaryResearch(jobId);
    if (cached && !isCacheExpired(cached.updatedAt)) {
      console.log("✅ Using cached Gemini salary data");
      return res.json(cached);
    }

    console.log("💡 Generating Gemini salary estimate for:", job.jobTitle);

    // Call Gemini service
    const result = await generateLLMSummaryAndTips({
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location,
      description: job.description,
    });

    // Save result in DB
    const dataToCache = {
      jobId,
      ...result,
      updatedAt: new Date(),
    };
    await cacheSalaryData(jobId, dataToCache);

    res.json(dataToCache);
  } catch (err) {
    console.error("❌ Salary research error:", err);
    res.status(500).json({ error: "Failed to generate salary insights" });
  }
});

export default router;
