import express from "express";
import InterviewCoachingInsight from "../models/coachinginsights.js";
import { verifyJWT } from "../middleware/auth.js";

const router = express.Router();

// ================================
// POST: Save a coaching insight
// ================================
router.post("/", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      questionId,
      jobId,
      response,
      scores,
      starBreakdown,
      weaknesses,
      suggestions,
      alternativeApproach,
      totalScore,
    } = req.body;

    const insight = await InterviewCoachingInsight.create({
      userId,
      questionId,
      jobId,
      response,
      scores,
      starBreakdown,
      weaknesses,
      suggestions,
      alternativeApproach,
      totalScore,
    });

    res.status(201).json(insight);
  } catch (err) {
    console.error("Error saving coaching insight:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================================
// GET: All coaching insights for current user
// ===============================================
router.get("/", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const insights = await InterviewCoachingInsight
      .find({ userId })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (err) {
    console.error("Error fetching insights:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===================================================
// GET: Coaching insights for a specific question
// ===================================================
router.get("/question/:questionId", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.params;

    const insights = await InterviewCoachingInsight
      .find({ userId, questionId })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (err) {
    console.error("Error fetching question insights:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================================
// GET: A single coaching insight by ID
// ===============================================
router.get("/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const insight = await InterviewCoachingInsight.findOne({
      _id: req.params.id,
      userId,
    });

    if (!insight) return res.status(404).json({ error: "Not found" });

    res.json(insight);
  } catch (err) {
    console.error("Error fetching insight:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ===============================================
// DELETE: Remove a coaching insight
// ===============================================
router.delete("/:id", verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const deleted = await InterviewCoachingInsight.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting insight:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
