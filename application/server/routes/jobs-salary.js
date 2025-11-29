// server/routes/job-salary.js
import express from "express";
import Jobs from "../models/jobs.js";

const router = express.Router();

/**
 * Update salaryAnalysis fields for a job
 */
router.patch("/:id/salary-analysis", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const job = await Jobs.findByIdAndUpdate(
      id,
      { $set: { salaryAnalysis: updates } },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json(job);
  } catch (err) {
    console.error("❌ Salary update error:", err);
    res.status(500).json({ error: "Failed to update salary details" });
  }
});

export default router;